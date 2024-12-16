import psycopg2
from psycopg2.extras import execute_values

# Supabase connection details
SUPABASE_HOST = "aws-0-us-west-1.pooler.supabase.com"
SUPABASE_PORT = 6543
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres.xrstrludepuahpovxpzb"
SUPABASE_PASSWORD = "AZ1d3Tab7my1TubG"

# Connect to Supabase database
def connect_db():
    try:
        return psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            dbname=SUPABASE_DB,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            sslmode="require"
        )
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise

# Fetch player stats from the database
def fetch_and_calculate_averages():
    """Fetch player stats and calculate averages where snaps = 1."""
    conn = connect_db()
    cursor = conn.cursor()

    # Fetch player stats where snaps = 1
    cursor.execute("""
        SELECT 
            player_name,
            position_id,
            team_id,  -- Team abbreviations are stored directly
            AVG(passing_attempts) AS avg_passing_attempts,
            AVG(completions) AS avg_completions,
            AVG(passing_yards) AS avg_passing_yards,
            AVG(passing_tds) AS avg_passing_tds,
            AVG(interceptions) AS avg_interceptions,
            AVG(rushing_attempts) AS avg_rushing_attempts,
            AVG(rushing_yards) AS avg_rushing_yards,
            AVG(rushing_tds) AS avg_rushing_tds,
            AVG(receptions) AS avg_receptions,
            AVG(receiving_yards) AS avg_receiving_yards,
            AVG(receiving_tds) AS avg_receiving_tds,
            AVG(targets) AS avg_targets,  -- New column for targets
            AVG(snaps) AS avg_snaps
        FROM player_stats
        WHERE snaps = 1
        GROUP BY player_name, position_id, team_id
    """)
    
    raw_averages = cursor.fetchall()
    cursor.close()
    conn.close()

    # Process the data to replace None with default values
    averages = []
    for row in raw_averages:
        processed_row = tuple(
            value if value is not None else ("N/A" if isinstance(value, str) else 0)
            for value in row
        )
        averages.append(processed_row)
    
    return averages

def insert_player_averages(averages):
    """Insert calculated averages into the player_averages table."""
    if not averages:
        print("No data to insert.")
        return

    conn = connect_db()
    cursor = conn.cursor()

    query = """
    INSERT INTO player_averages (
        player_name, position_id, team_id, avg_passing_attempts, avg_completions, avg_passing_yards,
        avg_passing_tds, avg_interceptions, avg_rushing_attempts, avg_rushing_yards,
        avg_rushing_tds, avg_receptions, avg_receiving_yards, avg_receiving_tds, avg_targets, avg_snaps
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (player_name, position_id) DO UPDATE SET
        avg_passing_attempts = EXCLUDED.avg_passing_attempts,
        avg_completions = EXCLUDED.avg_completions,
        avg_passing_yards = EXCLUDED.avg_passing_yards,
        avg_passing_tds = EXCLUDED.avg_passing_tds,
        avg_interceptions = EXCLUDED.avg_interceptions,
        avg_rushing_attempts = EXCLUDED.avg_rushing_attempts,
        avg_rushing_yards = EXCLUDED.avg_rushing_yards,
        avg_rushing_tds = EXCLUDED.avg_rushing_tds,
        avg_receptions = EXCLUDED.avg_receptions,
        avg_receiving_yards = EXCLUDED.avg_receiving_yards,
        avg_receiving_tds = EXCLUDED.avg_receiving_tds,
        avg_targets = EXCLUDED.avg_targets,  -- Handle targets in conflict resolution
        avg_snaps = EXCLUDED.avg_snaps;
    """

    for row in averages:
        if len(row) != 16:  # Ensure the row has the correct number of elements
            print(f"Skipping invalid row (expected 16 elements, got {len(row)}): {row}")
            continue

        try:
            cursor.execute(query, row)
        except psycopg2.Error as e:
            print(f"Error inserting row for player {row[0]}: {e}")
    
    conn.commit()
    cursor.close()
    conn.close()

# Main function to fetch and insert player averages
def main():
    try:
        print("Fetching player stats...")
        player_averages = fetch_and_calculate_averages()

        print("Inserting player averages into the database...")
        insert_player_averages(player_averages)

        print("Player averages successfully inserted/updated.")
    except Exception as e:
        print(f"Error: {e}")

# Run the script
if __name__ == "__main__":
    main()
