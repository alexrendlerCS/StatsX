import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

# Load credentials from .env
load_dotenv()

SUPABASE_HOST = os.getenv("SUPABASE_HOST")
SUPABASE_PORT = os.getenv("SUPABASE_PORT")
SUPABASE_DB = os.getenv("SUPABASE_DB")
SUPABASE_USER = os.getenv("SUPABASE_USER")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD")

def connect_db():
    return psycopg2.connect(
        host=SUPABASE_HOST,
        port=SUPABASE_PORT,
        dbname=SUPABASE_DB,
        user=SUPABASE_USER,
        password=SUPABASE_PASSWORD,
        sslmode="require"
    )

def generate_weekly_leaders(week):
    conn = connect_db()
    cursor = conn.cursor()

    # Define which stat to use per position
    stat_map = {
        "QB": "passing_yards",
        "RB": "rushing_yards",
        "WR": "receiving_yards",
        "TE": "receiving_yards",
    }

    all_leaders = []

    for position, stat_field in stat_map.items():
        query = f"""
            SELECT player_name, position_id, {stat_field}, matchup
            FROM player_stats
            WHERE week = %s AND position_id = %s
            ORDER BY {stat_field} DESC
            LIMIT 5
        """
        cursor.execute(query, (week, position))
        top_players = cursor.fetchall()

        for rank, row in enumerate(top_players, start=1):
            player_name, position_id, stat_value, matchup = row
            all_leaders.append((
                week, player_name, position_id, stat_value, matchup, rank
            ))

    # Insert into weekly_leaders table
    insert_query = """
        INSERT INTO weekly_leaders (
            week, player_name, position_id, stat_value, matchup, rank
        ) VALUES %s
        ON CONFLICT DO NOTHING
    """
    execute_values(cursor, insert_query, all_leaders)

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Inserted top players for week {week}.")

if __name__ == "__main__":
    import sys
    # Set UTF-8 encoding for Windows console
    if sys.platform == "win32":
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    
    # Get week from command line argument or input
    if len(sys.argv) > 1:
        week = int(sys.argv[1])
    else:
        week = int(input("Enter the current NFL week: "))
    
    generate_weekly_leaders(week=week)
