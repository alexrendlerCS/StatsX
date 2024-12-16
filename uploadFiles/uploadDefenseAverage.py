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

# Fetch and calculate averages from existing stats
def calculate_defense_averages():
    conn = connect_db()
    cursor = conn.cursor()

    # General Defensive Averages
    cursor.execute("""
        SELECT 
            team_id, position_id,
            AVG(rushing_attempts) AS avg_rushing_attempts,
            AVG(total_rushing_yards) AS avg_rushing_yards,
            AVG(avg_yards_per_carry) AS avg_yards_per_carry,
            AVG(rushing_tds) AS avg_rushing_tds,
            AVG(targets) AS avg_targets,
            AVG(receptions) AS avg_receptions,
            AVG(total_receiving_yards) AS avg_receiving_yards,
            AVG(avg_yards_per_catch) AS avg_yards_per_catch,
            AVG(receiving_tds) AS avg_receiving_tds
        FROM general_defensive_stats
        GROUP BY team_id, position_id;
    """)
    general_averages = cursor.fetchall()

    # QB Defensive Averages
    cursor.execute("""
        SELECT 
            team_id,
            AVG(passing_attempts) AS avg_passing_attempts,
            AVG(completions) AS avg_completions,
            AVG(passing_yards) AS avg_passing_yards,
            AVG(passing_tds) AS avg_passing_tds,
            AVG(interceptions) AS avg_interceptions,
            AVG(rate) AS avg_rate,
            AVG(rushing_attempts) AS avg_qb_rushing_attempts,
            AVG(rushing_yards) AS avg_qb_rushing_yards,
            AVG(avg_rushing_yards) AS avg_qb_avg_rushing_yards,
            AVG(rushing_tds) AS avg_qb_rushing_tds
        FROM qb_defensive_stats
        GROUP BY team_id;
    """)
    qb_averages = cursor.fetchall()

    cursor.close()
    conn.close()

    return general_averages, qb_averages

# Insert average stats into a new table
def insert_defense_averages(general_averages, qb_averages):
    conn = connect_db()
    cursor = conn.cursor()

    # Insert General Averages
    general_query = """
    INSERT INTO defense_averages (
        team_id, position_id, avg_rushing_attempts, avg_rushing_yards, avg_yards_per_carry,
        avg_rushing_tds, avg_targets, avg_receptions, avg_receiving_yards, avg_yards_per_catch, avg_receiving_tds
    ) VALUES %s
    ON CONFLICT (team_id, position_id) DO UPDATE SET
        avg_rushing_attempts = EXCLUDED.avg_rushing_attempts,
        avg_rushing_yards = EXCLUDED.avg_rushing_yards,
        avg_yards_per_carry = EXCLUDED.avg_yards_per_carry,
        avg_rushing_tds = EXCLUDED.avg_rushing_tds,
        avg_targets = EXCLUDED.avg_targets,
        avg_receptions = EXCLUDED.avg_receptions,
        avg_receiving_yards = EXCLUDED.avg_receiving_yards,
        avg_yards_per_catch = EXCLUDED.avg_yards_per_catch,
        avg_receiving_tds = EXCLUDED.avg_receiving_tds;
    """
    execute_values(cursor, general_query, general_averages)

    # Insert QB Averages
    qb_query = """
    INSERT INTO defense_averages_qb (
        team_id, avg_passing_attempts, avg_completions, avg_passing_yards,
        avg_passing_tds, avg_interceptions, avg_rate, avg_qb_rushing_attempts,
        avg_qb_rushing_yards, avg_qb_avg_rushing_yards, avg_qb_rushing_tds
    ) VALUES %s
    ON CONFLICT (team_id) DO UPDATE SET
        avg_passing_attempts = EXCLUDED.avg_passing_attempts,
        avg_completions = EXCLUDED.avg_completions,
        avg_passing_yards = EXCLUDED.avg_passing_yards,
        avg_passing_tds = EXCLUDED.avg_passing_tds,
        avg_interceptions = EXCLUDED.avg_interceptions,
        avg_rate = EXCLUDED.avg_rate,
        avg_qb_rushing_attempts = EXCLUDED.avg_qb_rushing_attempts,
        avg_qb_rushing_yards = EXCLUDED.avg_qb_rushing_yards,
        avg_qb_avg_rushing_yards = EXCLUDED.avg_qb_avg_rushing_yards,
        avg_qb_rushing_tds = EXCLUDED.avg_qb_rushing_tds;
    """
    execute_values(cursor, qb_query, qb_averages)

    conn.commit()
    cursor.close()
    conn.close()

# Main function
if __name__ == "__main__":
    general_averages, qb_averages = calculate_defense_averages()
    insert_defense_averages(general_averages, qb_averages)
    print("Defense averages successfully calculated and uploaded.")