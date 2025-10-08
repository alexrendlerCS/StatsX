"""
Configuration file for NFL Data Upload System
Update the CURRENT_WEEK here to easily change the default week for all uploads.
"""

# Current NFL Week (1-18)
# Update this value to change the default week for all uploads
CURRENT_WEEK = 5

# Default configuration for upload phases
DEFAULT_CONFIG = {
    'skip_schedule': True,   # Set to False to include schedule updates (normally one-time setup)
    'skip_optional': False,  # Set to True to skip optional data (betting lines, recent stats)
    'verbose': False,        # Set to True for detailed output
}

# Script configuration for week-dependent scripts
WEEK_DEPENDENT_SCRIPTS = {
    'uploadPlayer.py': {
        'week_param': 'current_week',
        'description': 'Uploads current week player stats from CBS Sports and SportsData API'
    },
    'uploadPlayerProjections.py': {
        'week_param': 'week_input', 
        'description': 'Generates player projections based on averages and matchups'
    },
    'uploadPlayerLines.py': {
        'week_param': 'week_input',
        'requires_csv': True,
        'csv_path': 'my-app/public/PlayerProps.csv',
        'description': 'Uploads betting lines from PlayerProps.csv'
    },
    'uploadPlayerRecent.py': {
        'week_param': 'current_week',
        'min_week': 3,  # Requires at least week 3 for 3-week lookback
        'description': 'Updates recent player stats (current week and 2 previous weeks)'
    },
    'generate_weekly_leaders.py': {
        'week_param': 'command_line',
        'script_path': '../my-app/Scripts/generate_weekly_leaders.py',
        'description': 'Generates weekly leaders for each position'
    },
    'generate_players_to_watch.py': {
        'week_param': 'command_line',
        'script_path': '../my-app/Scripts/generate_players_to_watch.py',
        'description': 'Generates players to watch based on performance and matchups'
    }
}

# Phase definitions
PHASES = {
    'schedule': {
        'scripts': ['scrape_nfl_schedule.py', 'uploadMatchup.py'],
        'description': 'Schedule management - updates NFL schedule and uploads to database'
    },
    'core': {
        'scripts': ['uploadPlayerList.py', 'uploadPlayer.py', 'uploadDefense.py'],
        'description': 'Core data upload - player lists, stats, and defense data'
    },
    'averages': {
        'scripts': ['uploadPlayerAverages.py', 'uploadDefenseAverage.py', 'uploadAllDefenseAVG.py'],
        'description': 'Calculated averages - player and defense averages from raw data'
    },
    'projections': {
        'scripts': ['uploadPlayerProjections.py', 'uploadMatchupRank.py'],
        'description': 'Projections and analysis - player projections and defensive rankings'
    },
    'optional': {
        'scripts': ['uploadPlayerLines.py', 'uploadPlayerRecent.py'],
        'description': 'Optional/weekly data - betting lines and recent stats'
    },
    'frontend': {
        'scripts': ['generate_weekly_leaders.py', 'generate_hot_cold_players.py', 'generate_players_to_watch.py', 'generate_projections.py'],
        'description': 'Frontend data generation - weekly leaders, hot/cold players, players to watch, and projections'
    }
}

def get_current_week():
    """Get the current week from configuration"""
    return CURRENT_WEEK

def update_current_week(new_week):
    """Update the current week in the configuration file"""
    if not (1 <= new_week <= 18):
        raise ValueError("Week must be between 1 and 18")
    
    # Read the current file
    with open(__file__, 'r') as f:
        content = f.read()
    
    # Replace the CURRENT_WEEK line
    import re
    pattern = r'CURRENT_WEEK = \d+'
    replacement = f'CURRENT_WEEK = {new_week}'
    new_content = re.sub(pattern, replacement, content)
    
    # Write back to file
    with open(__file__, 'w') as f:
        f.write(new_content)
    
    print(f"✅ Updated current week to {new_week}")

def get_phase_info(phase_name):
    """Get information about a specific phase"""
    return PHASES.get(phase_name, {})

def list_phases():
    """List all available phases"""
    for phase, info in PHASES.items():
        print(f"{phase}: {info['description']}")
        print(f"  Scripts: {', '.join(info['scripts'])}")
        print()
