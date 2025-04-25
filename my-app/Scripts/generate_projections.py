import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values, DictCursor

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

def generate_and_store_projections():
    print("📤 Uploading player projections to database...")

    conn = connect_db()
    cursor = conn.cursor(cursor_factory=DictCursor)

    # Load player info
    cursor.execute("SELECT DISTINCT normalized_name, player_name, position_id, team_id FROM player_stats")
    players = cursor.fetchall()

    # Load defensive team stats
    cursor.execute("SELECT * FROM defense_averages")
    defense_map = {(row["team_id"], row["position_id"]): row for row in cursor.fetchall()}

    cursor.execute("SELECT * FROM defense_averages_qb")
    defense_qb_map = {row["team_id"]: row for row in cursor.fetchall()}

    # Load league-wide averages
    cursor.execute("SELECT * FROM all_defense_averages")
    league_rows = cursor.fetchall()
    league_pos_map = {row["position_id"]: row for row in league_rows}

    cursor.execute("SELECT * FROM all_defense_averages_qb")
    league_qb_averages = cursor.fetchone()

    projections = []

    # Stat → column map for league/defense table lookup
    stat_column_map = {
        "passing_attempts": "avg_passing_attempts",
        "completions": "avg_completions",
        "passing_yards": "avg_passing_yards",
        "passing_tds": "avg_passing_tds",
        "interceptions": "avg_interceptions",
        "rushing_attempts": "avg_rushing_attempts",
        "rushing_yards": "avg_rushing_yards",
        "rushing_tds": "avg_rushing_tds",
        "receptions": "avg_receptions",
        "receiving_yards": "avg_receiving_yards",
        "receiving_tds": "avg_receiving_tds"
    }

    # Override QB-specific rushing keys
    qb_stat_column_map = {
        **stat_column_map,
        "rushing_attempts": "avg_qb_rushing_attempts",
        "rushing_yards": "avg_qb_rushing_yards",
        "rushing_tds": "avg_qb_rushing_tds"
    }

    position_stat_map = {
        "QB": ["passing_attempts", "completions", "passing_yards", "passing_tds", "interceptions", "rushing_attempts", "rushing_yards", "rushing_tds"],
        "RB": ["rushing_attempts", "rushing_yards", "rushing_tds", "receptions", "receiving_yards", "receiving_tds"],
        "WR": ["receptions", "receiving_yards", "receiving_tds", "rushing_attempts", "rushing_yards", "rushing_tds"],
        "TE": ["receptions", "receiving_yards", "receiving_tds", "rushing_attempts", "rushing_yards", "rushing_tds"]
    }

    for normalized_name, player_name, position_id, team_id in players:
        # Get player stat rows
        cursor.execute("""
            SELECT passing_attempts, completions, passing_yards, passing_tds, interceptions,
                   rushing_attempts, rushing_yards, rushing_tds,
                   receptions, receiving_yards, receiving_tds
            FROM player_stats
            WHERE normalized_name = %s
        """, (normalized_name,))
        stats = cursor.fetchall()
        if not stats:
            continue

        # Get opponent
        opp_cursor = conn.cursor()
        opp_cursor.execute("SELECT opponent_id FROM team_schedule WHERE team_id = %s ORDER BY week DESC LIMIT 1", (team_id,))
        opp = opp_cursor.fetchone()
        opp_cursor.close()
        if not opp:
            continue
        opponent_id = opp[0]

        # Get defense and league row
        defense = defense_qb_map.get(opponent_id) if position_id == "QB" else defense_map.get((opponent_id, position_id))
        league = league_qb_averages if position_id == "QB" else league_pos_map.get(position_id)
        if not defense or not league:
            continue

        stat_keys = position_stat_map.get(position_id, [])
        column_names = [desc.name for desc in cursor.description]
        available_stats = {col: idx for idx, col in enumerate(column_names)}
        col_map = qb_stat_column_map if position_id == "QB" else stat_column_map

        for stat in stat_keys:
            if stat not in available_stats:
                continue

            stat_idx = available_stats[stat]
            values = [float(row[stat_idx]) for row in stats if row[stat_idx] is not None]

            if not values:
                continue

            player_avg = sum(values) / len(values)
            col_name = col_map.get(stat)

            defense_val = float(defense.get(col_name, 0))
            league_val = float(league.get(col_name, 1))  # avoid divide-by-zero

            if player_avg > 0:
                defense_impact = player_avg * (defense_val / league_val)
                projected = player_avg * 0.7 + defense_impact * 0.3
                print(f"📈 [{player_name}] {stat.upper()} | avg={player_avg:.2f} | def_val={defense_val:.2f} | league_val={league_val:.2f}")
                projections.append((player_name, normalized_name, position_id, str(opponent_id), stat, round(projected, 2)))

    print("📤 Uploading player projections to database...")
    cursor.execute("DELETE FROM player_projections")
    execute_values(cursor, """
        INSERT INTO player_projections (
            player_name, normalized_name, position, opponent, stat_key, projection
        ) VALUES %s
    """, projections)

    conn.commit()
    cursor.close()
    conn.close()

    print(f"✅ Inserted {len(projections)} player projections.")

if __name__ == "__main__":
    generate_and_store_projections()
