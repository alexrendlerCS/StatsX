import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone
from decimal import Decimal

# Load environment variables
load_dotenv()

# Get sensitive info from environment
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Connect to Supabase database
def connect_db():
    return psycopg2.connect(
        host=SUPABASE_HOST,
        port=SUPABASE_PORT,
        dbname=SUPABASE_DB,
        user=SUPABASE_USER,
        password=SUPABASE_PASSWORD,
        sslmode="require"
    )

# Convert Decimal to float (handles None or `0E-20` values)
def to_float(value):
    if isinstance(value, Decimal):
        if value == Decimal('0E-20'):  # Treat `0E-20` as missing value
            return None
        return float(value)
    return value

# Fetch team schedule for the given week
def get_team_schedule(cursor, week):
    cursor.execute("SELECT team_id, week, opponent_id FROM team_schedule WHERE week = %s;", (week,))
    return cursor.fetchall()

# Fetch player stats and ensure all stats are available
def get_player_stats(cursor):
    cursor.execute("""
        SELECT player_name, position_id, team_id, 
               COALESCE(AVG(rushing_attempts), 0) AS rushing_attempts,
               COALESCE(AVG(rushing_yards), 0) AS rushing_yards,
               COALESCE(AVG(rushing_tds), 0) AS rushing_tds,
               COALESCE(AVG(receptions), 0) AS receptions,
               COALESCE(AVG(receiving_yards), 0) AS receiving_yards,
               COALESCE(AVG(receiving_tds), 0) AS receiving_tds,
               COALESCE(AVG(passing_attempts), 0) AS passing_attempts,
               COALESCE(AVG(passing_yards), 0) AS passing_yards,
               COALESCE(AVG(passing_tds), 0) AS passing_tds
        FROM player_stats
        GROUP BY player_name, position_id, team_id;
    """)
    result = cursor.fetchall()
    
    for row in result:
        # Ensure the expected number of columns are returned (should be 12 columns)
        if len(row) != 12:
            print(f"❌ Invalid row length: {len(row)} - Skipping this row.")
            continue  # Skip this row if the number of columns is incorrect
        yield row

# Fetch defense stats for the opponent
def get_defense_stats(cursor, team_id, position_id):
    if position_id == "QB":
        query = """
            SELECT avg_passing_attempts, avg_completions, avg_passing_yards,
                   avg_passing_tds, avg_interceptions,
                   avg_qb_rushing_attempts, avg_qb_rushing_yards, avg_qb_rushing_tds
            FROM defense_averages_qb
            WHERE team_id = %s;
        """
        cursor.execute(query, (team_id,))
    else:
        query = """
            SELECT avg_rushing_attempts, avg_rushing_yards, avg_rushing_tds,
                   avg_targets, avg_receptions, avg_receiving_yards, avg_receiving_tds
            FROM defense_averages
            WHERE team_id = %s AND position_id = %s;
        """
        cursor.execute(query, (team_id, position_id))

    return cursor.fetchone()

# Fetch league-wide averages for a given position
def get_league_averages(cursor, position_id):
    if position_id == "QB":
        query = """
            SELECT avg_passing_attempts, avg_completions, avg_passing_yards,
                   avg_passing_tds, avg_interceptions,
                   avg_qb_rushing_attempts, avg_qb_rushing_yards, avg_qb_rushing_tds
            FROM all_defense_averages_qb;
        """
        cursor.execute(query)
    else:
        query = """
            SELECT avg_rushing_attempts, avg_rushing_yards, avg_rushing_tds,
                   avg_targets, avg_receptions, avg_receiving_yards, avg_receiving_tds
            FROM all_defense_averages
            WHERE position_id = %s;
        """
        cursor.execute(query, (position_id,))

    return cursor.fetchone()

# Calculate projections based on the website's formula
def calculate_projection(player_avg, defense_avg, league_avg):
    if player_avg is None or defense_avg is None or league_avg is None:
        return None  # Skip calculations if any value is None

    # Ensure the values are converted to float or default to 0
    player_avg = to_float(player_avg) or 0  # Convert and handle None values
    defense_avg = to_float(defense_avg) or 0
    league_avg = to_float(league_avg) or 0

    if league_avg == 0:  # Avoid division by zero
        return round(player_avg, 1)

    player_weight = 0.7
    defense_weight = 0.3
    defense_factor = player_avg * (defense_avg / league_avg)

    return round(player_avg * player_weight + defense_factor * defense_weight, 1)

# Insert projections into the database
def insert_projections(cursor, projections):
    print("Inserting Projections:")  # Debugging print
    for projection in projections:
        print(f"Projection to insert: {projection}")  # Debugging print
        
    query = """
        INSERT INTO player_projections (
            player_name, position, team_id, week, opponent_id,
            projected_rushing_attempts, projected_rushing_yards, projected_rushing_tds,
            projected_receptions, projected_receiving_yards, projected_receiving_tds
        ) VALUES %s
        ON CONFLICT (player_name, week) DO UPDATE
        SET 
            projected_rushing_attempts = EXCLUDED.projected_rushing_attempts,
            projected_rushing_yards = EXCLUDED.projected_rushing_yards,
            projected_rushing_tds = EXCLUDED.projected_rushing_tds,
            projected_receptions = EXCLUDED.projected_receptions,
            projected_receiving_yards = EXCLUDED.projected_receiving_yards,
            projected_receiving_tds = EXCLUDED.projected_receiving_tds;
    """
    
    try:
        # Ensure projections contain the correct number of columns (11 columns)
        for projection in projections:
            if len(projection) != 11:
                print(f"❌ Invalid projection length: {len(projection)} - Skipping this projection.")
                continue  # Skip projections with incorrect length

        execute_values(cursor, query, projections)
    except Exception as e:
        print(f"❌ Error during projections insert: {e}")

# Main function to generate projections for a specific week
def upload_player_projections(week):
    conn = connect_db()
    cursor = conn.cursor()

    try:
        print(f"📅 Fetching data for Week {week}...")

        schedules = get_team_schedule(cursor, week)
        players = list(get_player_stats(cursor))  # Convert the generator to a list

        print(f"✅ Fetched {len(schedules)} schedules for Week {week}")
        print(f"✅ Fetched {len(players)} players")  # Now we can safely use len()

        projections_dict = {}

        for team_id, week, opponent_id in schedules:
            opponent_id = opponent_id.lstrip("@")  # Remove '@' from opponent_id

            for player in players:
                player_name, position_id, player_team, *player_averages = player

                if player_team != team_id:
                    continue  

                # Debugging: Print player stats before calculating projection
                print(f"Processing {player_name} ({position_id}) - Averaged stats count: {len(player_averages)} - Stats: {player_averages}")

                # Skip players with incomplete stats
                if len(player_averages) < 7:  # At least 7 stats are needed for projections
                    print(f"⚠️ Skipping {player_name} due to incomplete stats.")
                    continue

                defense_stats = get_defense_stats(cursor, opponent_id, position_id)
                league_averages = get_league_averages(cursor, position_id)

                # Ensure that defense_stats and league_averages have the expected number of elements
                if not defense_stats or not league_averages:
                    print(f"⚠️ Missing defense or league averages for {player_name} vs {opponent_id}. Skipping...")
                    continue  

                # Debugging: Print defense and league averages before calculation
                print(f"Defense stats for {player_name}: {defense_stats}")
                print(f"League averages for {player_name}: {league_averages}")

                # Check for the correct number of stats per position
                if position_id == 'QB':
                    expected_length = 8  # QBs have passing and rushing stats (8 values)
                else:
                    expected_length = 7  # RB, WR, TE have rushing/receiving stats (7 values)

                if len(defense_stats) != expected_length or len(league_averages) != expected_length:
                    print(f"⚠️ Mismatch in stats count for {player_name}. Skipping...")
                    continue

                projection_values = [
                    player_name, position_id, team_id, week, opponent_id
                ]

                # Calculate projections for each stat (up to the correct length for each position)
                for i in range(min(len(player_averages), expected_length)):
                    if player_averages[i] is not None:
                        projection_values.append(
                            calculate_projection(player_averages[i], defense_stats[i], league_averages[i])
                        )
                    else:
                        # If any player average is missing, use None for the projection
                        projection_values.append(None)

                # Ensure only one entry per (player_name, week)
                projections_dict[(player_name, week)] = tuple(projection_values)

        projections = list(projections_dict.values())

        if projections:
            insert_projections(cursor, projections)
            conn.commit()
            print(f"✅ Successfully uploaded projections for Week {week}!")
        else:
            print(f"⚠️ No projections generated for Week {week}.")

    except Exception as e:
        print(f"❌ Error during projections upload: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    week_input = input("Enter the week number to upload projections for: ")

    try:
        week_number = int(week_input)
        if 1 <= week_number <= 18:  # Ensure valid week range
            upload_player_projections(week_number)
        else:
            print("❌ Invalid week number! Please enter a number between 1 and 16.")
    except ValueError:
        print("❌ Invalid input! Please enter a valid number.")