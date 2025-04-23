import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values

# Load environment variables
load_dotenv()

# Supabase credentials from env
SUPABASE_HOST = os.getenv("SUPABASE_HOST")
SUPABASE_PORT = os.getenv("SUPABASE_PORT")
SUPABASE_DB = os.getenv("SUPABASE_DB")
SUPABASE_USER = os.getenv("SUPABASE_USER")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD")

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

# Fetch team_id mapping from the database
def get_team_mapping():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT team_id, abbreviation FROM teams;")
    team_mapping = {row[1]: row[0] for row in cursor.fetchall()}  # Map abbreviation to team_id
    cursor.close()
    conn.close()
    return team_mapping

# Fetch position validation from the database
def get_valid_positions():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT position_id FROM positions;")
    valid_positions = [row[0] for row in cursor.fetchall()]  # List of valid position IDs
    cursor.close()
    conn.close()
    return valid_positions

# Scrape data function
def scrape_data(team_mapping, valid_positions):
    general_stats = []
    qb_stats = []

    positions = ["TE", "WR", "RB", "QB"]
    teams = list(team_mapping.keys())

    for position in positions:
        if position not in valid_positions:
            print(f"Skipping invalid position: {position}")
            continue

        for team in teams:
            team_id = team_mapping.get(team)  # Fetch team_id directly
            if not team_id:
                print(f"Team {team} not found in database, skipping...")
                continue

            url = f"https://www.cbssports.com/fantasy/football/stats/posvsdef/{position}/{team}/teambreakdown/standard"
            print(f"Scraping URL: {url}")
            response = requests.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')

            rows = soup.select('tr.row1, tr.row2')

            for row in rows:
                cells = row.find_all('td')
                week_text = cells[0].text.strip()
                if not week_text.isdigit():
                    continue

                week = int(week_text)
                matchup = cells[1].text.strip().replace("[+]", "").strip()

                try:
                    if position == "QB":
                        qb_stats.append((
                            team_id, week, matchup,
                            int(float(cells[2].text.strip())),
                            int(float(cells[3].text.strip())),
                            int(float(cells[4].text.strip())),
                            int(float(cells[5].text.strip())),
                            int(float(cells[6].text.strip())),
                            float(cells[7].text.strip()),
                            int(float(cells[8].text.strip())),
                            int(float(cells[9].text.strip())),
                            float(cells[10].text.strip()),
                            int(float(cells[11].text.strip()))
                        ))
                    else:
                        general_stats.append((  
                            team_id, position, week, matchup,
                            int(float(cells[2].text.strip())),
                            int(float(cells[3].text.strip())),
                            float(cells[4].text.strip()),
                            int(float(cells[5].text.strip())),
                            int(float(cells[6].text.strip())),
                            int(float(cells[7].text.strip())),
                            int(float(cells[8].text.strip())),
                            float(cells[9].text.strip()),
                            int(float(cells[10].text.strip()))
                        ))
                except ValueError as e:
                    print(f"Error processing row: {e}")
                    continue

    return general_stats, qb_stats

# Insert data into Supabase tables
def insert_data(general_stats, qb_stats):
    conn = connect_db()
    cursor = conn.cursor()

    # QB stats insertion
    qb_query = """
    INSERT INTO qb_defensive_stats (
        team_id, week, matchup, passing_attempts, completions, passing_yards, 
        passing_tds, interceptions, rate, rushing_attempts, rushing_yards, 
        avg_rushing_yards, rushing_tds
    ) VALUES %s
    ON CONFLICT (team_id, week) DO UPDATE SET
        matchup = EXCLUDED.matchup,
        passing_attempts = EXCLUDED.passing_attempts,
        completions = EXCLUDED.completions,
        passing_yards = EXCLUDED.passing_yards,
        passing_tds = EXCLUDED.passing_tds,
        interceptions = EXCLUDED.interceptions,
        rate = EXCLUDED.rate,
        rushing_attempts = EXCLUDED.rushing_attempts,
        rushing_yards = EXCLUDED.rushing_yards,
        avg_rushing_yards = EXCLUDED.avg_rushing_yards,
        rushing_tds = EXCLUDED.rushing_tds;
    """
    execute_values(cursor, qb_query, qb_stats)

    # General stats insertion
    general_query = """
    INSERT INTO general_defensive_stats (
        team_id, position_id, week, matchup, rushing_attempts, total_rushing_yards, 
        avg_yards_per_carry, rushing_tds, targets, receptions, total_receiving_yards, 
        avg_yards_per_catch, receiving_tds
    ) VALUES %s
    ON CONFLICT (team_id, position_id, week) DO UPDATE SET
        matchup = EXCLUDED.matchup,
        rushing_attempts = EXCLUDED.rushing_attempts,
        total_rushing_yards = EXCLUDED.total_rushing_yards,
        avg_yards_per_carry = EXCLUDED.avg_yards_per_carry,
        rushing_tds = EXCLUDED.rushing_tds,
        targets = EXCLUDED.targets,
        receptions = EXCLUDED.receptions,
        total_receiving_yards = EXCLUDED.total_receiving_yards,
        avg_yards_per_catch = EXCLUDED.avg_yards_per_catch,
        receiving_tds = EXCLUDED.receiving_tds;
    """
    execute_values(cursor, general_query, general_stats)

    conn.commit()
    cursor.close()
    conn.close()

# Main function
if __name__ == "__main__":
    team_mapping = get_team_mapping()
    valid_positions = get_valid_positions()
    general_stats, qb_stats = scrape_data(team_mapping, valid_positions)
    insert_data(general_stats, qb_stats)
    print("Data successfully scraped and inserted.")
