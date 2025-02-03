import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone
from decimal import Decimal

# Supabase connection details
SUPABASE_HOST = "aws-0-us-west-1.pooler.supabase.com"
SUPABASE_PORT = 6543
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres.xrstrludepuahpovxpzb"
SUPABASE_PASSWORD = "AZ1d3Tab7my1TubG"

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

# Convert Decimal to float (handles None values)
def to_float(value):
    return float(value) if isinstance(value, Decimal) else value

# Fetch team schedule for the given week
def get_team_schedule(cursor, week):
    cursor.execute("SELECT team_id, week, opponent_id FROM team_schedule WHERE week = %s;", (week,))
    return cursor.fetchall()

# Fetch player stats from player_stats instead of player_averages
def get_player_stats(cursor):
    cursor.execute("""
        SELECT player_name, position_id, team_id, 
               AVG(rushing_attempts) AS rushing_attempts,
               AVG(rushing_yards) AS rushing_yards,
               AVG(rushing_tds) AS rushing_tds,
               AVG(receptions) AS receptions,
               AVG(receiving_yards) AS receiving_yards,
               AVG(receiving_tds) AS receiving_tds
        FROM player_stats
        GROUP BY player_name, position_id, team_id;
    """)
    return cursor.fetchall()

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
        return None  

    player_avg = to_float(player_avg)
    defense_avg = to_float(defense_avg)
    league_avg = to_float(league_avg)

    if league_avg == 0:  # Avoid division by zero
        return round(player_avg, 1)

    player_weight = 0.7
    defense_weight = 0.3
    defense_factor = player_avg * (defense_avg / league_avg)

    return round(player_avg * player_weight + defense_factor * defense_weight, 1)

# Insert projections into the database
def insert_projections(cursor, projections):
    query = """
        INSERT INTO player_projections (
            player_name, position, team_id, week, opponent_id,
            projected_rushing_attempts, projected_rushing_yards, projected_rushing_tds,
            projected_receptions, projected_receiving_yards, projected_receiving_tds,
            updated_at
        ) VALUES %s
        ON CONFLICT (player_name, week) DO UPDATE
        SET 
            projected_rushing_attempts = EXCLUDED.projected_rushing_attempts,
            projected_rushing_yards = EXCLUDED.projected_rushing_yards,
            projected_rushing_tds = EXCLUDED.projected_rushing_tds,
            projected_receptions = EXCLUDED.projected_receptions,
            projected_receiving_yards = EXCLUDED.projected_receiving_yards,
            projected_receiving_tds = EXCLUDED.projected_receiving_tds,
            updated_at = NOW();
    """

    execute_values(cursor, query, projections)

# Main function to generate projections for a specific week
def upload_player_projections(week):
    conn = connect_db()
    cursor = conn.cursor()

    try:
        print(f"📅 Fetching data for Week {week}...")

        schedules = get_team_schedule(cursor, week)
        players = get_player_stats(cursor)

        print(f"✅ Fetched {len(schedules)} schedules for Week {week}")
        print(f"✅ Fetched {len(players)} players")

        projections_dict = {}

        for team_id, week, opponent_id in schedules:
            opponent_id = opponent_id.lstrip("@")  # Remove '@' from opponent_id

            for player in players:
                player_name, position_id, player_team, *player_averages = player

                if player_team != team_id:
                    continue  

                defense_stats = get_defense_stats(cursor, opponent_id, position_id)
                league_averages = get_league_averages(cursor, position_id)

                if not defense_stats or not league_averages:
                    continue  

                projection_values = [
                    player_name, position_id, team_id, week, opponent_id
                ]

                for i in range(len(player_averages)):
                    projection_values.append(
                        calculate_projection(player_averages[i], defense_stats[i], league_averages[i])
                    )

                projection_values.append(datetime.now(timezone.utc))

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
