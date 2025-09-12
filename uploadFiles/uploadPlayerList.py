import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../my-app/.env')

# Supabase credentials from env
SUPABASE_HOST = os.getenv("SUPABASE_HOST")
SUPABASE_PORT = os.getenv("SUPABASE_PORT")
SUPABASE_DB = os.getenv("SUPABASE_DB")
SUPABASE_USER = os.getenv("SUPABASE_USER")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD")

position_map = {"WR": "WR", "QB": "QB", "RB": "RB", "TE": "TE"}


def connect_db():
    """Establish a connection to the database."""
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
        print(f"Error connecting to the database: {e}")
        raise


def scrape_player_names(week, position):
    """Scrape player names for a given week and position."""
    url = f"https://www.cbssports.com/nfl/stats/leaders/live/{position}/{week}/"
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch data for Week {week}, Position {position}")
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    rows = soup.select(".TableBase-bodyTr")
    player_names = []

    for row in rows:
        columns = row.find_all("td")
        if len(columns) < 3:  # Skip rows with insufficient data
            continue

        try:
            player_name = columns[0].select_one(".CellPlayerName--long a").text.strip()
            if player_name and player_name not in player_names:
                player_names.append(player_name)
        except AttributeError:
            # Skip rows where player name element is not found
            continue

    return player_names


def get_all_player_names():
    """Get all unique player names from multiple weeks and positions."""
    all_players = set()
    
    # Scrape from multiple weeks to get comprehensive player list
    weeks_to_scrape = [1, 2, 3, 4, 5]  # Scrape first 5 weeks to get most players
    
    for week in weeks_to_scrape:
        print(f"Scraping Week {week}...")
        for position, position_code in position_map.items():
            print(f"  Getting {position} players...")
            player_names = scrape_player_names(week, position_code)
            all_players.update(player_names)
            print(f"    Found {len(player_names)} {position} players")
    
    return list(all_players)


def upload_player_list_to_database(player_names):
    """Upload player names to the player_list table."""
    conn = connect_db()
    cursor = conn.cursor()

    # Clear existing data (optional - remove this if you want to keep existing data)
    print("Clearing existing player_list data...")
    cursor.execute("DELETE FROM player_list;")

    # Prepare data for insertion
    player_data = [(name,) for name in player_names]

    # Insert player names
    query = """
    INSERT INTO player_list (player_name) 
    VALUES %s
    ON CONFLICT (player_name) DO NOTHING;
    """

    if player_data:
        execute_values(cursor, query, player_data)
        conn.commit()
        print(f"Successfully inserted {len(player_data)} unique player names into player_list table.")
    else:
        print("No player names to insert.")

    cursor.close()
    conn.close()


def main():
    """Main function to scrape and upload player names."""
    print("Starting player list generation...")
    
    # Get all unique player names
    print("Scraping player names from CBS Sports...")
    all_player_names = get_all_player_names()
    
    print(f"Found {len(all_player_names)} unique players total")
    
    # Sort for better readability
    all_player_names.sort()
    
    # Upload to database
    print("Uploading to database...")
    upload_player_list_to_database(all_player_names)
    
    print("Player list generation complete!")
    
    # Print sample of players for verification
    print("\nSample of players added:")
    for i, name in enumerate(all_player_names[:10]):
        print(f"  {i+1}. {name}")
    if len(all_player_names) > 10:
        print(f"  ... and {len(all_player_names) - 10} more players")


if __name__ == "__main__":
    main()
