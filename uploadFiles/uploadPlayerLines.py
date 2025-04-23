import psycopg2
import csv
from psycopg2.extras import execute_values
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

# Get sensitive info from environment
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Connect to Supabase database
def connect_db():
    return psycopg2.connect(
        host=SUPABASE_HOST,
        port=SUPABASE_PORT,
        dbname=SUPABASE_DB,
        user=SUPABASE_USER,
        password=SUPABASE_PASSWORD,
        sslmode="require"
    )

# Function to normalize player names (match website logic)
def normalize_string(s):
    return (
        s.lower()
        .replace("-", "")
        .replace(".", "")
        .replace("'", "")
        .replace("’", "")
        .strip()
    )

# Mapping stat names in CSV to database column names
STAT_MAPPING = {
    "player_pass_attempts": "projected_passing_attempts",
    "player_pass_completions": "projected_completions",
    "player_pass_yds": "projected_passing_yards",
    "player_pass_tds": "projected_passing_tds",
    "player_interceptions": "projected_interceptions",
    "player_rush_attempts": "projected_rushing_attempts",
    "player_rush_yds": "projected_rushing_yards",
    "player_rush_tds": "projected_rushing_tds",
    "player_receptions": "projected_receptions",
    "player_reception_yds": "projected_receiving_yards",
    "player_receiving_tds": "projected_receiving_tds",
}

# Parse CSV and insert into database
def upload_player_lines(csv_file_path, week):
    conn = connect_db()
    cursor = conn.cursor()

    try:
        print(f"📂 Reading PlayerProps.csv for Week {week}...")
        player_lines = {}

        with open(csv_file_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                player_name = normalize_string(row["description"])
                stat_key = row["market"].strip()
                line_value = row["point"].strip()

                if not line_value or line_value == "N/A":
                    continue  # Skip missing values

                # Initialize player entry if not already present
                if player_name not in player_lines:
                    player_lines[player_name] = {
                        "player_name": row["description"],
                        "position": None,  # Will fill later
                        "team_id": None,   # Will fill later
                        "week": week,
                        "opponent_id": None,  # Will fill later
                        "projected_passing_attempts": None,
                        "projected_completions": None,
                        "projected_passing_yards": None,
                        "projected_passing_tds": 1.5,  # Default value
                        "projected_interceptions": None,
                        "projected_rushing_attempts": None,
                        "projected_rushing_yards": None,
                        "projected_rushing_tds": 0.5,  # Default value
                        "projected_receptions": None,
                        "projected_receiving_yards": None,
                        "projected_receiving_tds": 0.5,  # Default value
                        "updated_at": datetime.now(timezone.utc),
                    }

                # Map CSV stat key to database column and insert value
                db_column = STAT_MAPPING.get(stat_key)
                if db_column:
                    player_lines[player_name][db_column] = float(line_value)

        print(f"✅ Parsed {len(player_lines)} players from CSV.")

        # Fetch additional player data (position, team, opponent) from database
        cursor.execute("SELECT player_name, position, team_id FROM player_projections WHERE week = %s;", (week,))
        db_players = cursor.fetchall()

        for db_player in db_players:
            db_name, position, team_id = db_player
            normalized_name = normalize_string(db_name)

            if normalized_name in player_lines:
                player_lines[normalized_name]["position"] = position
                player_lines[normalized_name]["team_id"] = team_id

        # Convert data into insert format
        insert_data = [tuple(p.values()) for p in player_lines.values()]

        if insert_data:
            print(f"📤 Uploading {len(insert_data)} player lines to database...")
            query = """
                INSERT INTO player_lines (
                    player_name, position, team_id, week, opponent_id,
                    projected_passing_attempts, projected_completions, projected_passing_yards,
                    projected_passing_tds, projected_interceptions,
                    projected_rushing_attempts, projected_rushing_yards, projected_rushing_tds,
                    projected_receptions, projected_receiving_yards, projected_receiving_tds,
                    updated_at
                ) VALUES %s
                ON CONFLICT (player_name, week) DO UPDATE
                SET 
                    projected_passing_attempts = EXCLUDED.projected_passing_attempts,
                    projected_completions = EXCLUDED.projected_completions,
                    projected_passing_yards = EXCLUDED.projected_passing_yards,
                    projected_passing_tds = EXCLUDED.projected_passing_tds,
                    projected_interceptions = EXCLUDED.projected_interceptions,
                    projected_rushing_attempts = EXCLUDED.projected_rushing_attempts,
                    projected_rushing_yards = EXCLUDED.projected_rushing_yards,
                    projected_rushing_tds = EXCLUDED.projected_rushing_tds,
                    projected_receptions = EXCLUDED.projected_receptions,
                    projected_receiving_yards = EXCLUDED.projected_receiving_yards,
                    projected_receiving_tds = EXCLUDED.projected_receiving_tds,
                    updated_at = NOW();
            """

            execute_values(cursor, query, insert_data)
            conn.commit()
            print(f"✅ Successfully uploaded player lines for Week {week}!")

        else:
            print("⚠️ No valid data found in CSV to upload.")

    except Exception as e:
        print(f"❌ Error during player lines upload: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("🔴 Database connection closed.")

# Run the script
if __name__ == "__main__":
    week_input = input("Enter the week number for PlayerProps.csv: ").strip()

    try:
        week_number = int(week_input)
        if 1 <= week_number <= 18:  # Ensure valid week range
            csv_path = "my-app/public/PlayerProps.csv"  # Path to CSV file
            upload_player_lines(csv_path, week_number)
        else:
            print("❌ Invalid week number! Please enter a number between 1 and 18.")
    except ValueError:
        print("❌ Invalid input! Please enter a valid number.")
