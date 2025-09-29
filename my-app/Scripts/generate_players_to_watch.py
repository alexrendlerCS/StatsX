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

# CURRENT_WEEK will be passed as parameter

def connect_db():
    return psycopg2.connect(
        host=SUPABASE_HOST,
        port=SUPABASE_PORT,
        dbname=SUPABASE_DB,
        user=SUPABASE_USER,
        password=SUPABASE_PASSWORD,
        sslmode="require"
    )

def normalize_name(name):
    return name.lower().replace("-", "").replace(".", "").replace("’", "").replace("'", "").replace("`", "").strip()

def generate_players_to_watch(current_week):
    conn = connect_db()
    cursor = conn.cursor()

    # Fetch all necessary data
    cursor.execute("""
        SELECT player_name, position_id, team_id, passing_yards, rushing_yards, receiving_yards, week 
        FROM recent_player_stats
    """)
    recent = cursor.fetchall()

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
    season = cursor.fetchall()

    # Calculate actual games played by counting records per player
    cursor.execute("""
        SELECT player_name, position_id, COUNT(*) as actual_games_played 
        FROM player_stats 
        GROUP BY player_name, position_id
    """)
    games_played_data = cursor.fetchall()

    cursor.execute("SELECT team_id, opponent_id FROM team_schedule WHERE week = %s", (current_week + 1,))
    matchups_data = cursor.fetchall()
    matchups = dict(matchups_data)
    
    print(f"Looking for matchups in week {current_week + 1}")
    print(f"Found {len(matchups)} matchups in team_schedule")

    cursor.execute("SELECT team_id, avg_passing_yards FROM defense_averages_qb")
    qb_defense = {row[0]: float(row[1]) if row[1] else 0 for row in cursor.fetchall()}

    cursor.execute("SELECT team_id, avg_rushing_yards, avg_receiving_yards FROM defense_averages")
    def_defense = {row[0]: {"rushing": float(row[1]) if row[1] else 0, "receiving": float(row[2]) if row[2] else 0} for row in cursor.fetchall()}

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
    debug_counts = {
        "processed": 0,
        "no_season_data": 0,
        "no_stat_change": 0,
        "low_volume": 0,
        "no_opponent": 0,
        "no_defense_data": 0,
        "no_matchup_criteria": 0,
        "added": 0
    }

    for key, stats in recent_map.items():
        debug_counts["processed"] += 1
        player_name, position, team_id = key
        if (player_name, position) not in season_map:
            debug_counts["no_season_data"] += 1
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

        # Debug: Show first 5 players' stat differences
        if debug_counts["processed"] <= 5:
            print(f"Debug {player_name} ({position}):")
            print(f"  Passing: recent={player_avgs['passing']:.1f} vs season={averages['passing']:.1f} (diff={abs(player_avgs['passing'] - averages['passing']):.1f})")
            print(f"  Rushing: recent={player_avgs['rushing']:.1f} vs season={averages['rushing']:.1f} (diff={abs(player_avgs['rushing'] - averages['rushing']):.1f})")
            print(f"  Receiving: recent={player_avgs['receiving']:.1f} vs season={averages['receiving']:.1f} (diff={abs(player_avgs['receiving'] - averages['receiving']):.1f})")

        if abs(player_avgs["passing"] - averages["passing"]) >= 15:
            stat_used = "passing"
        elif abs(player_avgs["rushing"] - averages["rushing"]) >= 8:
            stat_used = "rushing"
        elif abs(player_avgs["receiving"] - averages["receiving"]) >= 10:
            stat_used = "receiving"

        if not stat_used:
            debug_counts["no_stat_change"] += 1
            continue

        is_overperforming = player_avgs[stat_used] > averages[stat_used]
        is_underperforming = player_avgs[stat_used] < averages[stat_used]

        # 🚫 Filter: low volume, inactive, or unreliable players
        if debug_counts["processed"] <= 5:
            print(f"  Volume check - season_avg={averages[stat_used]:.1f}, recent_avg={player_avgs[stat_used]:.1f}, games={games_played}")
            
        if averages[stat_used] < 15:
            if debug_counts["processed"] <= 5:
                print(f"  FILTERED: season average too low ({averages[stat_used]:.1f} < 15)")
            debug_counts["low_volume"] += 1
            continue
        if player_avgs[stat_used] <= 5:
            if debug_counts["processed"] <= 5:
                print(f"  FILTERED: recent average too low ({player_avgs[stat_used]:.1f} <= 5)")
            debug_counts["low_volume"] += 1
            continue
        if games_played < 4:  # Require at least 4 games for reliable averages
            if debug_counts["processed"] <= 5:
                print(f"  FILTERED: games played too low ({games_played} < 4)")
            debug_counts["low_volume"] += 1
            continue

        opponent = matchups.get(team_id)
        if not opponent:
            debug_counts["no_opponent"] += 1
            continue

        # Clean opponent ID (remove @ symbol for away games)
        clean_opponent = opponent.lstrip('@') if opponent else None
        
        if debug_counts["processed"] <= 5:
            print(f"  Opponent: {opponent} -> cleaned: {clean_opponent}")

        if stat_used == "passing":
            defense_val = float(qb_defense.get(clean_opponent, 0))
        else:
            defense_val = float(def_defense.get(clean_opponent, {}).get(stat_used, 0))

        if not defense_val:
            debug_counts["no_defense_data"] += 1
            continue

        matchup_score = league_avg[stat_used] - defense_val

        # Format the yards differential
        if matchup_score > 0:
            yards_diff = f"(+{matchup_score:.1f} vs avg)"
        else:
            yards_diff = f"({matchup_score:.1f} vs avg)"

        matchup_type = "Bad Matchup"
        if matchup_score > 20:
            matchup_type = f"Great Matchup {yards_diff}"
        elif matchup_score > 0:
            matchup_type = f"Good Matchup {yards_diff}"
        else:
            matchup_type = f"Bad Matchup {yards_diff}"

        if (
            (is_overperforming and ("Great Matchup" in matchup_type or "Good Matchup" in matchup_type)) or
            (is_underperforming and "Bad Matchup" in matchup_type)
        ):
            performance_type = "Overperforming" if is_overperforming else "Underperforming"
            debug_counts["added"] += 1
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
        else:
            debug_counts["no_matchup_criteria"] += 1


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

    print(f"Debug - Processing results:")
    print(f"  Processed: {debug_counts['processed']}")
    print(f"  No season data: {debug_counts['no_season_data']}")
    print(f"  No significant stat change: {debug_counts['no_stat_change']}")
    print(f"  Low volume: {debug_counts['low_volume']}")
    print(f"  No opponent: {debug_counts['no_opponent']}")
    print(f"  No defense data: {debug_counts['no_defense_data']}")
    print(f"  No matchup criteria met: {debug_counts['no_matchup_criteria']}")
    print(f"  Added to watch: {debug_counts['added']}")
    print(f"Inserted {len(players_to_watch)} players to watch.")

if __name__ == "__main__":
    import sys
    # Set UTF-8 encoding for Windows console
    if sys.platform == "win32":
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    
    # Get week from command line argument or input
    if len(sys.argv) > 1:
        current_week = int(sys.argv[1])
    else:
        current_week = int(input("Enter the current NFL week: "))
    
    generate_players_to_watch(current_week)
