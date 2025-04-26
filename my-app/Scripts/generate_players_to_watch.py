import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()

DB_HOST = os.getenv("SUPABASE_HOST")
DB_PORT = os.getenv("SUPABASE_PORT")
DB_NAME = os.getenv("SUPABASE_DB")
DB_USER = os.getenv("SUPABASE_USER")
DB_PASSWORD = os.getenv("SUPABASE_PASSWORD")

CURRENT_WEEK = 17  # Update as needed

def connect_db():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def normalize_name(name):
    return name.lower().replace("-", "").replace(".", "").replace("’", "").replace("'", "").replace("`", "").strip()

def generate_players_to_watch():
    conn = connect_db()
    cursor = conn.cursor()

    # Fetch all necessary data
    cursor.execute("""
        SELECT player_name, position_id, team_id, passing_yards, rushing_yards, receiving_yards, week 
        FROM recent_player_stats
    """)
    recent = cursor.fetchall()

    cursor.execute("""
        SELECT player_name, position_id, avg_passing_yards, avg_rushing_yards, avg_receiving_yards
        FROM player_averages
    """)
    season = cursor.fetchall()

    cursor.execute("SELECT player_name, position_id, games_played FROM player_stats")
    games_played_data = cursor.fetchall()

    cursor.execute("SELECT team_id, opponent_id FROM team_schedule WHERE week = %s", (CURRENT_WEEK + 1,))
    matchups = dict(cursor.fetchall())

    cursor.execute("SELECT team_id, avg_passing_yards FROM defense_averages_qb")
    qb_defense = dict(cursor.fetchall())

    cursor.execute("SELECT team_id, avg_rushing_yards, avg_receiving_yards FROM defense_averages")
    def_defense = {row[0]: {"rushing": row[1], "receiving": row[2]} for row in cursor.fetchall()}

    cursor.execute("SELECT avg_passing_yards FROM all_defense_averages_qb")
    league_passing_avg = cursor.fetchone()[0]

    cursor.execute("SELECT avg_rushing_yards, avg_receiving_yards FROM all_defense_averages")
    league_rushing_avg, league_receiving_avg = cursor.fetchone()

    league_avg = {
        "passing": float(league_passing_avg or 0),
        "rushing": float(league_rushing_avg or 0),
        "receiving": float(league_receiving_avg or 0)
    }

    # Build maps
    recent_map = {}
    for row in recent:
        player_name, position_id, team_id, passing_yards, rushing_yards, receiving_yards, week = row
        key = (player_name, position_id, team_id)
        if key not in recent_map:
            recent_map[key] = {"passing": [], "rushing": [], "receiving": []}
        if passing_yards: recent_map[key]["passing"].append(passing_yards)
        if rushing_yards: recent_map[key]["rushing"].append(rushing_yards)
        if receiving_yards: recent_map[key]["receiving"].append(receiving_yards)

    season_map = {
        (row[0], row[1]): {
            "passing": float(row[2] or 0),
            "rushing": float(row[3] or 0),
            "receiving": float(row[4] or 0)
        }
        for row in season
    }

    games_played_map = {
        (row[0], row[1]): row[2] or 0
        for row in games_played_data
    }

    players_to_watch = []

    for key, stats in recent_map.items():
        player_name, position, team_id = key
        if (player_name, position) not in season_map:
            continue
        averages = season_map[(player_name, position)]
        games_played = games_played_map.get((player_name, position), 0)

        def avg(lst): return sum(lst) / len(lst) if lst else 0

        player_avgs = {
            "passing": avg(stats["passing"]),
            "rushing": avg(stats["rushing"]),
            "receiving": avg(stats["receiving"])
        }

        stat_used = None
        is_overperforming = False
        is_underperforming = False

        if abs(player_avgs["passing"] - averages["passing"]) >= 20:
            stat_used = "passing"
        elif abs(player_avgs["rushing"] - averages["rushing"]) >= 10:
            stat_used = "rushing"
        elif abs(player_avgs["receiving"] - averages["receiving"]) >= 15:
            stat_used = "receiving"

        if not stat_used:
            continue

        is_overperforming = player_avgs[stat_used] > averages[stat_used]
        is_underperforming = player_avgs[stat_used] < averages[stat_used]

        # 🚫 Filter: low volume, inactive, or unreliable players
        if averages[stat_used] < 15:
            continue
        if player_avgs[stat_used] <= 5:
            continue
        if games_played <= 3:
            continue

        opponent = matchups.get(team_id)
        if not opponent:
            continue

        if stat_used == "passing":
            defense_val = qb_defense.get(opponent, 0)
        else:
            defense_val = def_defense.get(opponent, {}).get(stat_used, 0)

        if not defense_val:
            continue

        matchup_score = league_avg[stat_used] - defense_val

        matchup_type = "Bad Matchup"
        if matchup_score > 20:
            matchup_type = "Great Matchup"
        elif matchup_score > 0:
            matchup_type = "Good Matchup"

        if (
            (is_overperforming and matchup_type in ["Great Matchup", "Good Matchup"]) or
            (is_underperforming and matchup_type == "Bad Matchup")
        ):
            performance_type = "Overperforming" if is_overperforming else "Underperforming"
            players_to_watch.append((
                normalize_name(player_name),  # ✅ normalized_name
                player_name,
                position,
                {
                    "passing": "Passing Yards",
                    "rushing": "Rushing Yards",
                    "receiving": "Receiving Yards"
                }[stat_used],
                player_avgs[stat_used],
                averages[stat_used],
                opponent,
                matchup_type,
                performance_type
            ))


    # Insert into table
    cursor.execute("DELETE FROM players_to_watch")
    execute_values(cursor, """
        INSERT INTO players_to_watch (
            normalized_name, player_name, position, stat_to_display, last_3_avg,
            season_avg, opponent, matchup_type, performance_type
        ) VALUES %s
    """, players_to_watch)


    conn.commit()
    cursor.close()
    conn.close()

    print(f"Inserted {len(players_to_watch)} players to watch.")

if __name__ == "__main__":
    generate_players_to_watch()
