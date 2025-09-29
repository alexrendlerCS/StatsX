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

    # Fetch season averages (calculate from ALL weeks in player_stats)
    cursor.execute("""
        SELECT 
            player_name, 
            position_id, 
            AVG(passing_yards) as avg_passing_yards,
            AVG(rushing_yards) as avg_rushing_yards, 
            AVG(receiving_yards) as avg_receiving_yards
        FROM player_stats
        GROUP BY player_name, position_id
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
            "avg_passing_yards": float(row[2]) if row[2] else 0,
            "avg_rushing_yards": float(row[3]) if row[3] else 0,
            "avg_receiving_yards": float(row[4]) if row[4] else 0,
        }
        for row in season_averages
    }

    games_played_map = {
        (row[0], row[1]): int(row[2]) if row[2] else 0
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
        player_stats[key]["passing_yards"].append(float(pass_yds) if pass_yds else 0)
        player_stats[key]["rushing_yards"].append(float(rush_yds) if rush_yds else 0)
        player_stats[key]["receiving_yards"].append(float(recv_yds) if recv_yds else 0)

    hot_players = []
    cold_players = []
    
    debug_count = 0
    filtered_out_reasons = {
        "missing_data": 0,
        "low_volume": 0,
        "low_change": 0,
        "passed_filters": 0
    }

    for key, values in player_stats.items():
        name, position = key
        if key not in averages_map or key not in games_played_map:
            filtered_out_reasons["missing_data"] += 1
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

        # Use position-appropriate primary stat instead of best change
        primary_stats = {
            "QB": "passing",
            "RB": "rushing", 
            "WR": "receiving",
            "TE": "receiving",
            "K": "passing",  # Fallback
            "DEF": "passing"  # Fallback
        }
        
        stat_name = primary_stats.get(position, "passing")
        change = changes[stat_name]
        
        stat_label = {
            "passing": "Passing Yds",
            "rushing": "Rushing Yds",
            "receiving": "Receiving Yds"
        }[stat_name]

        recent_avg = recent[stat_name]
        season_avg = avg_stats[f"avg_{stat_name}_yards"]

        # Debug: Print first few players to see what's happening
        if debug_count < 5:
            print(f"Debug - {name} ({position}): recent_avg={recent_avg:.2f}, season_avg={season_avg:.2f}, change={change:.2f}%, games={games_played}")
            debug_count += 1

        # Filter out low volume or inactive players (adjusted thresholds)
        min_season_avg = 5 if stat_name == "receiving" else 10 if stat_name == "rushing" else 30  # Lower thresholds for different positions
        min_recent_avg = 1 if stat_name == "receiving" else 2 if stat_name == "rushing" else 5
        
        if season_avg < min_season_avg or recent_avg <= min_recent_avg or games_played <= 1:
            filtered_out_reasons["low_volume"] += 1
            continue

        row = (name, position, stat_label, recent_avg, season_avg, change)

        # Only include players with meaningful changes (at least 20% difference)
        if abs(change) < 20:
            filtered_out_reasons["low_change"] += 1
            continue
        
        filtered_out_reasons["passed_filters"] += 1

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

    print(f"Processed {len(player_stats)} players from recent stats.")
    print(f"Found {len(averages_map)} players in season averages.")
    print(f"Found {len(games_played_map)} players with games played data.")
    print(f"Filter results:")
    print(f"  - Missing data: {filtered_out_reasons['missing_data']}")
    print(f"  - Low volume: {filtered_out_reasons['low_volume']}")
    print(f"  - Low change (<10%): {filtered_out_reasons['low_change']}")
    print(f"  - Passed filters: {filtered_out_reasons['passed_filters']}")
    print(f"Inserted {len(hot_players)} hot players and {len(cold_players)} cold players.")

if __name__ == "__main__":
    import sys
    # Set UTF-8 encoding for Windows console
    if sys.platform == "win32":
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    
    generate_hot_and_cold_players()
