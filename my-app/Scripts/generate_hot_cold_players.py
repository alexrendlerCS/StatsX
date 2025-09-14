import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

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

def generate_hot_and_cold_players():
    conn = connect_db()
    cursor = conn.cursor()

    # Fetch recent 3-week stats
    cursor.execute("""
        SELECT player_name, position_id, passing_yards, rushing_yards, receiving_yards
        FROM recent_player_stats
    """)
    recent_data = cursor.fetchall()

    # Fetch season averages
    cursor.execute("""
        SELECT player_name, position_id, avg_passing_yards, avg_rushing_yards, avg_receiving_yards
        FROM player_averages
    """)
    season_averages = cursor.fetchall()

    # Fetch games played from player_stats
    cursor.execute("""
        SELECT player_name, position_id, games_played
        FROM player_stats
    """)
    games_played_data = cursor.fetchall()

    # Lookup maps
    averages_map = {
        (row[0], row[1]): {
            "avg_passing_yards": row[2] or 0,
            "avg_rushing_yards": row[3] or 0,
            "avg_receiving_yards": row[4] or 0,
        }
        for row in season_averages
    }

    games_played_map = {
        (row[0], row[1]): row[2] or 0
        for row in games_played_data
    }

    # Group recent stats
    player_stats = {}
    for name, position, pass_yds, rush_yds, recv_yds in recent_data:
        key = (name, position)
        if key not in player_stats:
            player_stats[key] = {
                "passing_yards": [],
                "rushing_yards": [],
                "receiving_yards": []
            }
        player_stats[key]["passing_yards"].append(pass_yds or 0)
        player_stats[key]["rushing_yards"].append(rush_yds or 0)
        player_stats[key]["receiving_yards"].append(recv_yds or 0)

    hot_players = []
    cold_players = []

    for key, values in player_stats.items():
        name, position = key
        if key not in averages_map or key not in games_played_map:
            continue

        avg_stats = averages_map[key]
        games_played = games_played_map[key]

        def get_avg(lst):
            return sum(lst) / len(lst) if lst else 0

        recent = {
            "passing": get_avg(values["passing_yards"]),
            "rushing": get_avg(values["rushing_yards"]),
            "receiving": get_avg(values["receiving_yards"])
        }

        deltas = {
            "passing": recent["passing"] - avg_stats["avg_passing_yards"],
            "rushing": recent["rushing"] - avg_stats["avg_rushing_yards"],
            "receiving": recent["receiving"] - avg_stats["avg_receiving_yards"],
        }

        changes = {
            "passing": (deltas["passing"] / avg_stats["avg_passing_yards"]) * 100 if avg_stats["avg_passing_yards"] else 0,
            "rushing": (deltas["rushing"] / avg_stats["avg_rushing_yards"]) * 100 if avg_stats["avg_rushing_yards"] else 0,
            "receiving": (deltas["receiving"] / avg_stats["avg_receiving_yards"]) * 100 if avg_stats["avg_receiving_yards"] else 0,
        }

        # Best stat change
        stat_name, change = max(changes.items(), key=lambda x: abs(x[1]))
        stat_label = {
            "passing": "Passing Yds",
            "rushing": "Rushing Yds",
            "receiving": "Receiving Yds"
        }[stat_name]

        recent_avg = recent[stat_name]
        season_avg = avg_stats[f"avg_{stat_name}_yards"]

        # Filter out low volume or inactive players
        if season_avg < 15 or recent_avg <= 5 or games_played <= 3:
            continue

        row = (name, position, stat_label, recent_avg, season_avg, change)

        if change > 0:
            hot_players.append(row)
        elif change < 0:
            cold_players.append(row)

    # Refresh DB
    cursor.execute("DELETE FROM hot_players;")
    cursor.execute("DELETE FROM cold_players;")

    execute_values(cursor, """
        INSERT INTO hot_players (
            player_name, position, stat, recent_average, season_average, percentage_change
        ) VALUES %s
    """, hot_players)

    execute_values(cursor, """
        INSERT INTO cold_players (
            player_name, position, stat, recent_average, season_average, percentage_change
        ) VALUES %s
    """, cold_players)

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Inserted {len(hot_players)} hot players and {len(cold_players)} cold players.")

if __name__ == "__main__":
    generate_hot_and_cold_players()
