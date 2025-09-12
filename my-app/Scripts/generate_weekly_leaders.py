import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

# Load credentials from .env
load_dotenv()

DB_HOST = os.getenv("SUPABASE_HOST")
DB_PORT = os.getenv("SUPABASE_PORT")
DB_NAME = os.getenv("SUPABASE_DB")
DB_USER = os.getenv("SUPABASE_USER")
DB_PASSWORD = os.getenv("SUPABASE_PASSWORD")

def connect_db():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
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
    generate_weekly_leaders(week=1)  # Replace 16 with your target week
