import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone

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

# Fetch defensive averages and league-wide averages from the database
def get_defensive_data():
    conn = connect_db()
    cursor = conn.cursor()

    # Fetch team defensive averages with corrected TE/WR separation
    cursor.execute("""
        SELECT team_id, 'QB' AS position, avg_passing_yards AS avg_stat FROM defense_averages_qb
        UNION ALL
        SELECT team_id, 'RB', avg_rushing_yards FROM defense_averages
        WHERE position_id = 'RB'
        UNION ALL
        SELECT team_id, 'WR', avg_receiving_yards FROM defense_averages WHERE position_id = 'WR'
        UNION ALL
        SELECT team_id, 'TE', avg_receiving_yards FROM defense_averages WHERE position_id = 'TE'
    """)
    team_defense = cursor.fetchall()

    # Fetch league-wide averages with corrected TE/WR separation
    cursor.execute("""
        SELECT 'QB' AS position, avg_passing_yards AS avg_stat FROM all_defense_averages_qb
        UNION ALL
        SELECT 'RB', avg_rushing_yards FROM all_defense_averages WHERE position_id = 'RB'
        UNION ALL
        SELECT 'WR', avg_receiving_yards FROM all_defense_averages WHERE position_id = 'WR'
        UNION ALL
        SELECT 'TE', avg_receiving_yards FROM all_defense_averages WHERE position_id = 'TE'
    """)
    league_avg = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.close()
    conn.close()
    return team_defense, league_avg

# Calculate defensive matchup rankings
def calculate_rankings(team_defense, league_avg):
    rankings = {}
    
    # Group data by position
    for team_id, position, avg_stat in team_defense:
        league_avg_stat = league_avg.get(position, 0)
        yards_above_avg = avg_stat - league_avg_stat

        if (position, team_id) not in rankings:
            rankings[(position, team_id)] = (position, team_id, avg_stat, yards_above_avg)

    # Convert rankings dictionary to sorted list
    sorted_rankings = []
    position_groups = {}

    for (position, team_id), data in rankings.items():
        if position not in position_groups:
            position_groups[position] = []
        position_groups[position].append(data)

    for position, teams in position_groups.items():
        ranked_teams = sorted(teams, key=lambda x: x[3], reverse=True)  # Sort by yards_above_avg
        for rank, (pos, team_id, avg_stat, yards_above_avg) in enumerate(ranked_teams, start=1):
            sorted_rankings.append((pos, team_id, avg_stat, yards_above_avg, rank, datetime.now(timezone.utc)))

    return sorted_rankings

# Insert defensive rankings into the database
def insert_rankings(rankings):
    conn = connect_db()
    cursor = conn.cursor()

    query = """
    INSERT INTO defensive_matchup_rankings (position, team_id, avg_stat, yards_above_avg, rank, updated_at)
    VALUES %s
    ON CONFLICT (position, team_id) DO UPDATE SET
        avg_stat = EXCLUDED.avg_stat,
        yards_above_avg = EXCLUDED.yards_above_avg,
        rank = EXCLUDED.rank,
        updated_at = EXCLUDED.updated_at;
    """
    execute_values(cursor, query, rankings)
    conn.commit()
    cursor.close()
    conn.close()

# Main execution
if __name__ == "__main__":
    team_defense, league_avg = get_defensive_data()
    rankings = calculate_rankings(team_defense, league_avg)
    insert_rankings(rankings)
    print("Defensive matchup rankings calculated and uploaded successfully.")
