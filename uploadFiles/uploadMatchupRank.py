import psycopg2
from psycopg2.extras import execute_values
from decimal import Decimal

# Supabase connection details
SUPABASE_HOST = "aws-0-us-west-1.pooler.supabase.com"
SUPABASE_PORT = 6543
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres.xrstrludepuahpovxpzb"
SUPABASE_PASSWORD = "AZ1d3Tab7my1TubG"

CURRENT_WEEK = 17  # Update this for the current NFL week
MATCHUP_TYPES = {"Great Matchup": 2, "Good Matchup": 1, "Bad Matchup": 0}


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


def fetch_defensive_averages(conn):
    league_averages = {}
    team_defense_stats = {}

    with conn.cursor() as cursor:
        # Fetch league-wide averages
        cursor.execute("SELECT avg_rushing_yards, avg_receiving_yards FROM all_defense_averages")
        league_avg = cursor.fetchone()
        cursor.execute("SELECT avg_passing_yards FROM all_defense_averages_qb")
        qb_league_avg = cursor.fetchone()

        league_averages = {
            "passing": float(qb_league_avg[0]),
            "rushing": float(league_avg[0]),
            "receiving": float(league_avg[1]),
        }

        # Fetch team defensive stats
        cursor.execute("SELECT team_id, avg_passing_yards FROM defense_averages_qb")
        qb_defenses = cursor.fetchall()
        cursor.execute("SELECT team_id, avg_rushing_yards, avg_receiving_yards FROM defense_averages")
        other_defenses = cursor.fetchall()

        for team_id, avg_passing_yards in qb_defenses:
            team_defense_stats[team_id] = {"passing": float(avg_passing_yards)}

        for team_id, avg_rushing_yards, avg_receiving_yards in other_defenses:
            if team_id not in team_defense_stats:
                team_defense_stats[team_id] = {}
            team_defense_stats[team_id].update({
                "rushing": float(avg_rushing_yards),
                "receiving": float(avg_receiving_yards),
            })

    return league_averages, team_defense_stats


def update_matchup_rank():
    conn = connect_db()

    try:
        league_avg, team_defenses = fetch_defensive_averages(conn)

        with conn.cursor() as cursor:
            # Fetch player stats and opponents for the current week
            cursor.execute("""
                SELECT ps.player_id, ps.player_name, ps.position_id, ts.opponent_id
                FROM player_stats ps
                JOIN team_schedule ts ON ps.team_id = ts.team_id
                WHERE ps.week = %s AND ts.week = %s
            """, (CURRENT_WEEK, CURRENT_WEEK))
            player_stats = cursor.fetchall()

            for player_id, player_name, position, opponent_id in player_stats:
                normalized_opponent_id = opponent_id.lstrip('@')

                if normalized_opponent_id not in team_defenses:
                    continue

                defense_stats = team_defenses[normalized_opponent_id]
                matchup_score = 0
                matchup_type = "Bad Matchup"

                # Calculate matchup type based on position
                if position == "QB":
                    stat_value = float(defense_stats.get("passing", 0)) - league_avg["passing"]
                    matchup_score = stat_value
                elif position == "RB":
                    stat_value = float(defense_stats.get("rushing", 0)) - league_avg["rushing"]
                    matchup_score = stat_value
                elif position in ["WR", "TE"]:
                    stat_value = float(defense_stats.get("receiving", 0)) - league_avg["receiving"]
                    matchup_score = stat_value

                # Determine matchup type
                if matchup_score > 20:
                    matchup_type = "Great Matchup"
                elif matchup_score > 0:
                    matchup_type = "Good Matchup"

                # Update the player's matchup rank in the database
                matchup_rank = MATCHUP_TYPES[matchup_type]

                cursor.execute("""
                    UPDATE player_stats
                    SET matchup_rank = %s
                    WHERE player_id = %s
                """, (matchup_rank, player_id))
                print(f"Updated {player_name}: {matchup_type} ({matchup_rank})")

        conn.commit()

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    update_matchup_rank()
