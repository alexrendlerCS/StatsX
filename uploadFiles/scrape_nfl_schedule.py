#!/usr/bin/env python3
"""
NFL Schedule Scraper
Scrapes the 2025 NFL schedule from FantasyData and updates nfl_schedule.csv
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import os
from typing import Dict, List, Tuple

# Team abbreviation mapping (FantasyData format to your format)
TEAM_ABBREVIATIONS = {
    'Arizona Cardinals': 'ARI',
    'Atlanta Falcons': 'ATL', 
    'Baltimore Ravens': 'BAL',
    'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR',
    'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL',
    'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAC',
    'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV',
    'Los Angeles Chargers': 'LAC',
    'Los Angeles Rams': 'LAR',
    'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN',
    'New England Patriots': 'NE',
    'New Orleans Saints': 'NO',
    'New York Giants': 'NYG',
    'New York Jets': 'NYJ',
    'Philadelphia Eagles': 'PHI',
    'Pittsburgh Steelers': 'PIT',
    'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA',
    'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN',
    'Washington Commanders': 'WAS'
}

def scrape_nfl_schedule() -> Dict[str, List[str]]:
    """
    Scrape NFL schedule from FantasyData website
    Returns a dictionary with team names as keys and weekly opponents as values
    """
    url = "https://fantasydata.com/nfl/schedule"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        print("🔄 Fetching NFL schedule from FantasyData...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the schedule table
        schedule_table = soup.find('table')
        if not schedule_table:
            raise Exception("Schedule table not found")
        
        # Parse the table rows
        rows = schedule_table.find_all('tr')
        schedule_data = {}
        
        for row in rows[1:]:  # Skip header row
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue
                
            # Get team name from first cell
            team_link = cells[0].find('a')
            if not team_link:
                continue
                
            team_name = team_link.text.strip()
            
            # Skip if not a valid team
            if team_name not in TEAM_ABBREVIATIONS:
                continue
                
            # Get weekly opponents (columns 1-18)
            weekly_opponents = []
            for i in range(1, 19):  # Weeks 1-18
                if i < len(cells):
                    cell = cells[i]
                    
                    # Get the full cell text content (including @ symbols)
                    cell_text = cell.get_text(strip=True)
                    
                    # Check if there's a link in the cell and extract its text
                    opponent_link = cell.find('a')
                    if opponent_link:
                        # Get the link text, but preserve any @ symbols from the full cell text
                        link_text = opponent_link.get_text(strip=True)
                        
                        # If the cell text contains @ but the link text doesn't, add it
                        if '@' in cell_text and not link_text.startswith('@'):
                            cell_text = '@' + link_text
                        else:
                            cell_text = link_text
                    
                    weekly_opponents.append(cell_text)
                else:
                    weekly_opponents.append("")
            
            schedule_data[team_name] = weekly_opponents
            print(f"✅ Parsed schedule for {team_name}")
        
        return schedule_data
        
    except requests.RequestException as e:
        print(f"❌ Error fetching schedule: {e}")
        return {}
    except Exception as e:
        print(f"❌ Error parsing schedule: {e}")
        return {}

def parse_opponent(opponent_text: str) -> str:
    """
    Parse opponent text to extract team abbreviation
    Handles various formats like '@NO', 'CAR', 'Bye', etc.
    """
    if not opponent_text or opponent_text.upper() == 'BYE':
        return 'Bye'
    
    # Keep the @ symbol if it exists, just clean up the text
    opponent = opponent_text.strip()
    
    # Extract the team abbreviation part (remove @ but preserve it)
    is_away = opponent.startswith('@')
    team_part = opponent.replace('@', '').strip()
    
    # Try to find team abbreviation
    for team_name, abbrev in TEAM_ABBREVIATIONS.items():
        if abbrev.upper() == team_part.upper():
            # Return with @ symbol if it was an away game
            return '@' + abbrev if is_away else abbrev
    
    # If not found, return original (might be a new format)
    return opponent

def format_schedule_for_csv(schedule_data: Dict[str, List[str]]) -> pd.DataFrame:
    """
    Convert scraped schedule data to DataFrame format matching your CSV structure
    """
    # Create DataFrame with proper structure
    df_data = {}
    
    for team_name, weekly_opponents in schedule_data.items():
        team_abbrev = TEAM_ABBREVIATIONS[team_name]
        formatted_opponents = []
        
        for week, opponent in enumerate(weekly_opponents, 1):
            if week <= 18:  # Only process weeks 1-18
                formatted_opp = parse_opponent(opponent)
                formatted_opponents.append(formatted_opp)
        
        # Pad with empty strings if needed
        while len(formatted_opponents) < 18:
            formatted_opponents.append("")
            
        df_data[team_abbrev] = formatted_opponents
    
    # Create DataFrame
    df = pd.DataFrame(df_data).T
    
    # Add week columns
    week_columns = [str(i) for i in range(1, 19)]
    df.columns = week_columns
    
    # Add TEAM column
    df.insert(0, 'TEAM', df.index)
    
    return df

def backup_existing_schedule(csv_path: str) -> str:
    """
    Create a backup of the existing schedule file
    """
    if os.path.exists(csv_path):
        backup_path = csv_path.replace('.csv', '_backup.csv')
        os.rename(csv_path, backup_path)
        print(f"📁 Backed up existing schedule to {backup_path}")
        return backup_path
    return ""

def update_nfl_schedule():
    """
    Main function to scrape and update the NFL schedule
    """
    csv_path = "nfl_schedule.csv"
    
    print("🏈 NFL Schedule Updater")
    print("=" * 50)
    
    # Backup existing file
    backup_path = backup_existing_schedule(csv_path)
    
    # Scrape schedule data
    schedule_data = scrape_nfl_schedule()
    
    if not schedule_data:
        print("❌ Failed to scrape schedule data")
        if backup_path:
            os.rename(backup_path, csv_path)
            print("🔄 Restored backup file")
        return False
    
    # Convert to DataFrame
    df = format_schedule_for_csv(schedule_data)
    
    # Sort teams alphabetically by abbreviation
    df = df.sort_index()
    
    # Save to CSV
    df.to_csv(csv_path, index=False)
    
    print(f"✅ Successfully updated {csv_path}")
    print(f"📊 Updated schedule for {len(df)} teams")
    
    # Display first few rows
    print("\n📋 Schedule Preview:")
    print(df.head().to_string(index=False))
    
    return True

def validate_schedule(csv_path: str) -> bool:
    """
    Validate the updated schedule file
    """
    try:
        df = pd.read_csv(csv_path)
        
        # Check structure
        expected_columns = ['TEAM'] + [str(i) for i in range(1, 19)]
        if list(df.columns) != expected_columns:
            print(f"❌ Invalid column structure. Expected: {expected_columns}")
            return False
        
        # Check team count
        if len(df) != 32:
            print(f"❌ Expected 32 teams, found {len(df)}")
            return False
        
        # Check for valid team abbreviations
        valid_teams = set(TEAM_ABBREVIATIONS.values())
        teams_in_file = set(df['TEAM'].values)
        
        if teams_in_file != valid_teams:
            missing = valid_teams - teams_in_file
            extra = teams_in_file - valid_teams
            if missing:
                print(f"❌ Missing teams: {missing}")
            if extra:
                print(f"❌ Extra teams: {extra}")
            return False
        
        print("✅ Schedule validation passed")
        return True
        
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

if __name__ == "__main__":
    # Set UTF-8 encoding for Windows console
    import sys
    if sys.platform == "win32":
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    
    success = update_nfl_schedule()
    
    if success:
        # Validate the updated file
        validate_schedule("nfl_schedule.csv")
        print("\n🎉 NFL Schedule update completed successfully!")
    else:
        print("\n💥 NFL Schedule update failed!")
