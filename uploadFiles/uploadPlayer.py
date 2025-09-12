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
API_KEY = os.getenv("SPORTSDATA_API_KEY")

position_map = {"WR": "WR", "QB": "QB", "RB": "RB", "TE": "TE"}


def normalize_name_for_matching(name):
    """Normalize names for better matching between CBS and API"""
    # Remove common suffixes and normalize
    normalized = name.strip()
    
    # Remove Sr, Jr, III, IV, V suffixes (case insensitive)
    suffixes_to_remove = [' Sr', ' Jr', ' III', ' IV', ' V', ' sr', ' jr', ' iii', ' iv', ' v']
    for suffix in suffixes_to_remove:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)].strip()
            break
    
    # Also try regex approach for more robust matching (handles periods)
    import re
    normalized = re.sub(r'\s+(Sr|Jr|III|IV|V)\.?$', '', normalized, flags=re.IGNORECASE).strip()
    
    return normalized


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


def scrape_stats(week, position):
    """Scrape stats for a given week and position."""
    url = f"https://www.cbssports.com/nfl/stats/leaders/live/{position}/{week}/"
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch data for Week {week}, Position {position}")
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    rows = soup.select(".TableBase-bodyTr")
    player_data = []

    for row in rows:
        columns = row.find_all("td")
        if len(columns) < 3:  # Skip rows with insufficient data
            continue

        player_name = columns[0].select_one(".CellPlayerName--long a").text.strip()
        matchup = columns[1].text.strip()
        fpts = int(columns[2].text.strip()) if columns[2].text.strip().isdigit() else 0

        # Initialize player data structure with defaults
        player_stats = {
            "player_name": player_name,
            "position_id": position,
            "week": week,
            "matchup": matchup,
            "fpts": fpts,
            "completions": 0,
            "passing_attempts": 0,
            "passing_yards": 0,
            "passing_tds": 0,
            "interceptions": 0,
            "rushing_attempts": 0,
            "rushing_yards": 0,
            "rushing_tds": 0,
            "receptions": 0,
            "receiving_yards": 0,
            "receiving_tds": 0,
            "targets": 0,
            "snaps": None,  # To be filled from API
            "team_id": None,  # To be filled from API
            "opponent": None  # To be filled from API
        }

        # Parse stats based on position
        if position == "QB":
            player_stats["completions"] = int(columns[3].text.strip()) if columns[3].text.strip().isdigit() else 0
            player_stats["passing_attempts"] = int(columns[4].text.strip()) if columns[4].text.strip().isdigit() else 0
            player_stats["passing_yards"] = int(columns[5].text.strip()) if columns[5].text.strip().isdigit() else 0
            player_stats["passing_tds"] = int(columns[6].text.strip()) if columns[6].text.strip().isdigit() else 0
            player_stats["interceptions"] = int(columns[7].text.strip()) if columns[7].text.strip().isdigit() else 0
            player_stats["rushing_attempts"] = int(columns[8].text.strip()) if columns[8].text.strip().isdigit() else 0
            player_stats["rushing_yards"] = int(columns[9].text.strip()) if columns[9].text.strip().isdigit() else 0
            player_stats["rushing_tds"] = int(columns[10].text.strip()) if columns[10].text.strip().isdigit() else 0

        elif position == "RB":
            player_stats["rushing_attempts"] = int(columns[3].text.strip()) if columns[3].text.strip().isdigit() else 0
            player_stats["rushing_yards"] = int(columns[4].text.strip()) if columns[4].text.strip().isdigit() else 0
            player_stats["rushing_tds"] = int(columns[5].text.strip()) if columns[5].text.strip().isdigit() else 0
            player_stats["receptions"] = int(columns[6].text.strip()) if columns[6].text.strip().isdigit() else 0
            player_stats["receiving_yards"] = int(columns[7].text.strip()) if columns[7].text.strip().isdigit() else 0
            player_stats["targets"] = int(columns[8].text.strip()) if columns[8].text.strip().isdigit() else 0
            player_stats["receiving_tds"] = int(columns[9].text.strip()) if columns[8].text.strip().isdigit() else 0

        elif position in ["WR", "TE"]:
            player_stats["receptions"] = int(columns[3].text.strip()) if columns[3].text.strip().isdigit() else 0
            player_stats["receiving_yards"] = int(columns[4].text.strip()) if columns[4].text.strip().isdigit() else 0
            player_stats["targets"] = int(columns[5].text.strip()) if columns[5].text.strip().isdigit() else 0
            player_stats["receiving_tds"] = int(columns[6].text.strip()) if columns[6].text.strip().isdigit() else 0
            player_stats["rushing_attempts"] = int(columns[7].text.strip()) if columns[7].text.strip().isdigit() else 0
            player_stats["rushing_yards"] = int(columns[8].text.strip()) if columns[8].text.strip().isdigit() else 0
            player_stats["rushing_tds"] = int(columns[9].text.strip()) if columns[9].text.strip().isdigit() else 0

        player_data.append(player_stats)

    return player_data



def fetch_player_stats(season, week):
    """Fetch player stats from the SportsDataIO API."""
    url = f"https://api.sportsdata.io/v3/nfl/stats/json/PlayerGameStatsByWeek/{season}/{week}"
    headers = {"Ocp-Apim-Subscription-Key": API_KEY}
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code}, {response.text}")
        return []

    return response.json()


def merge_stats(scraped_data, api_data, team_mapping):
    """Merge API fields (`snaps`, `team_id`, `opponent`) into scraped data using API."""
    
    # Manual correction for mismatched team abbreviations
    abbreviation_fixes = {
        "JAX": "JAC"  # Map JAX (API) to JAC (database)
    }

    merged_data = []
    unmatched_players = []
    
    for player in scraped_data:
        player_matched = False
        
        # Try exact match first
        for api_player in api_data:
            team_abbr = api_player.get("Team")
            corrected_team_abbr = abbreviation_fixes.get(team_abbr, team_abbr)
            if api_player["Name"] == player["player_name"]:
                player['snaps'] = api_player.get('Played', 0)
                player['team_id'] = team_mapping.get(corrected_team_abbr)
                player['opponent'] = api_player.get('Opponent')
                player_matched = True
                break
        
        # If exact match failed, try normalized name matching
        if not player_matched:
            cbs_normalized = normalize_name_for_matching(player["player_name"])
            matching_players = []
            
            for api_player in api_data:
                api_name = api_player["Name"]
                api_normalized = normalize_name_for_matching(api_name)
                
                if cbs_normalized.lower() == api_normalized.lower():
                    matching_players.append(api_player)
            
            # If we found multiple matches, be more selective
            if len(matching_players) > 1:
                print(f"⚠️  Multiple matches found for {player['player_name']}:")
                for match in matching_players:
                    print(f"    {match['Name']} - {match.get('Team', 'N/A')}")
                
                # For Deebo Samuel, prefer WAS team
                if "deebo" in player["player_name"].lower() and "samuel" in player["player_name"].lower():
                    preferred_match = next((p for p in matching_players if p.get("Team") == "WAS"), None)
                    if preferred_match:
                        api_player = preferred_match
                        print(f"✅ Selected WAS team match for Deebo Samuel: {api_player['Name']}")
                    else:
                        api_player = matching_players[0]  # Fallback to first match
                        print(f"⚠️  No WAS team match found, using first match: {api_player['Name']}")
                else:
                    api_player = matching_players[0]  # Use first match for other players
                    print(f"✅ Using first match: {api_player['Name']}")
            elif len(matching_players) == 1:
                api_player = matching_players[0]
                print(f"✅ Single match found: {api_player['Name']}")
            else:
                api_player = None
            
            if api_player:
                team_abbr = api_player.get("Team")
                corrected_team_abbr = abbreviation_fixes.get(team_abbr, team_abbr)
                player['snaps'] = api_player.get('Played', 0)
                player['team_id'] = team_mapping.get(corrected_team_abbr)
                player['opponent'] = api_player.get('Opponent')
                print(f"✅ Matched with normalization: {player['player_name']} -> {api_player['Name']} ({corrected_team_abbr})")
                player_matched = True
        
        if not player_matched:
            # Player not found in API
            print(f"❌ No match: {player['player_name']}")
            unmatched_players.append(player['player_name'])
            continue
        
        # Ensure `team_id` is not None
        if player['team_id']:
            merged_data.append(player)

    if unmatched_players:
        print(f"\n📊 Summary: {len(merged_data)} players matched, {len(unmatched_players)} unmatched")
        print(f"Unmatched players: {unmatched_players[:5]}{'...' if len(unmatched_players) > 5 else ''}")

    return merged_data



def upload_to_database(player_data):
    """Upload merged data to the database."""
    conn = connect_db()
    cursor = conn.cursor()

    # Ensure unique constraint exists
    cursor.execute("""
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'player_stats' AND indexname = 'unique_player_week_team'
        ) THEN
            ALTER TABLE player_stats ADD CONSTRAINT unique_player_week_team UNIQUE (player_name, team_id, week);
        END IF;
    END $$;
    """)

    query = """
    INSERT INTO player_stats (
        player_name, position_id, team_id, week, matchup, fpts,
        completions, passing_attempts, passing_yards, passing_tds, interceptions,
        rushing_attempts, rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds,
        targets, snaps, opponent
    ) VALUES %s
    ON CONFLICT (player_name, team_id, week) DO UPDATE SET
        snaps = COALESCE(EXCLUDED.snaps, player_stats.snaps),
        opponent = COALESCE(EXCLUDED.opponent, player_stats.opponent),
        team_id = COALESCE(EXCLUDED.team_id, player_stats.team_id);
    """

    values = [
        (
            p['player_name'], p['position_id'], p['team_id'], p['week'], p['matchup'], p['fpts'],
            p['completions'], p['passing_attempts'], p['passing_yards'], p['passing_tds'], p['interceptions'],
            p['rushing_attempts'], p['rushing_yards'], p['rushing_tds'], p['receptions'], p['receiving_yards'], p['receiving_tds'],
            p['targets'], p['snaps'], p['opponent']
        )
        for p in player_data if p['team_id']
    ]

    if values:
        execute_values(cursor, query, values)
        conn.commit()
        print(f"Inserted/Updated {len(values)} rows.")
    else:
        print("No valid data to insert.")

    cursor.close()
    conn.close()


def main():
    season = "2025REG"  # Current season
    current_week = 2  # Set current week to 2

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT team_id, abbreviation FROM teams;")
    team_mapping = {row[1]: row[0] for row in cursor.fetchall()}
    cursor.close()
    conn.close()

    # Upload data for current week only
    for position, position_code in position_map.items():
        print(f"Scraping Week {current_week}, Position {position}")
        scraped_data = scrape_stats(current_week, position_code)
        api_data = fetch_player_stats(season, current_week)
        merged_data = merge_stats(scraped_data, api_data, team_mapping)

        # Debugging merged data before uploading
        print("Sample Merged Data:", merged_data[:3])

        upload_to_database(merged_data)
        print(f"Uploaded data for Week {current_week}, Position {position}")


if __name__ == "__main__":
    main()
