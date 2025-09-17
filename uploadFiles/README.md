# NFL Data Upload System

This folder contains a unified system for uploading NFL data to the database. The system is designed to run all upload scripts in the correct dependency order with easy week configuration.

## Quick Start

### Run All Uploads (Recommended)

```bash
# Run all uploads for Week 2 (schedule skipped by default)
python run_all_uploads.py --week 2

# Run with verbose output
python run_all_uploads.py --week 2 --verbose

# Include schedule update (one-time setup)
python run_all_uploads.py --week 2 --include-schedule
```

### Run Specific Phases

```bash
# Run only the core data upload phase
python run_all_uploads.py --week 2 --phase core

# Run only projections and analysis
python run_all_uploads.py --week 2 --phase projections
```

## Script Execution Order

The upload system runs scripts in the following phases to ensure proper dependencies:

### Phase 1: Schedule Management (Foundation)

- `scrape_nfl_schedule.py` - Updates NFL schedule CSV from FantasyData
- `uploadMatchup.py` - Uploads schedule to database

### Phase 2: Core Data Upload

- `uploadPlayerList.py` - Creates comprehensive player list
- `uploadPlayer.py` - Uploads current week player stats
- `uploadDefense.py` - Uploads defensive statistics

### Phase 3: Calculated Averages

- `uploadPlayerAverages.py` - Calculates player averages from stats
- `uploadDefenseAverage.py` - Calculates defense averages
- `uploadAllDefenseAVG.py` - Calculates league-wide defense averages

### Phase 4: Projections & Analysis

- `uploadPlayerProjections.py` - Generates player projections
- `uploadMatchupRank.py` - Calculates defensive matchup rankings

### Phase 5: Optional/Weekly Data

- `uploadPlayerLines.py` - Uploads betting lines (requires PlayerProps.csv)
- `uploadPlayerRecent.py` - Updates recent player stats

## Command Line Options

```bash
python run_all_uploads.py [OPTIONS]

Options:
  --week, -w WEEK        Current NFL week (1-18, default: 1)
  --phase, -p PHASE      Run only specific phase:
                         - schedule: Schedule management
                         - core: Core data upload
                         - averages: Calculated averages
                         - projections: Projections & analysis
                         - optional: Optional/weekly data
  --include-schedule     Include schedule management phase (normally skipped as one-time setup)
  --skip-optional        Skip optional/weekly data phase
  --verbose, -v          Enable verbose output
  --help, -h             Show help message
```

## Examples

### Weekly Data Update

```bash
# Update all data for Week 5
python run_all_uploads.py --week 5
```

### Include Schedule Update (One-time Setup)

```bash
# Run all uploads including schedule (only needed once per season)
python run_all_uploads.py --week 5 --include-schedule
```

### Run Only Core Data

```bash
# Just update player stats and defense data
python run_all_uploads.py --week 5 --phase core
```

### Run Projections Only

```bash
# Generate new projections after updating averages
python run_all_uploads.py --week 5 --phase projections
```

### Skip Optional Data

```bash
# Run everything except betting lines and recent stats
python run_all_uploads.py --week 5 --skip-optional
```

## Prerequisites

### Required Files

- `my-app/.env` - Database credentials and API keys
- `my-app/public/PlayerProps.csv` - Required for `uploadPlayerLines.py`

### Required Environment Variables

The following must be set in `my-app/.env`:

```
SUPABASE_HOST=your_host
SUPABASE_PORT=your_port
SUPABASE_DB=your_database
SUPABASE_USER=your_username
SUPABASE_PASSWORD=your_password
SPORTSDATA_API_KEY=your_api_key
```

## Error Handling

The script includes comprehensive error handling:

- **Stops execution** if critical scripts fail (Phases 1-4)
- **Continues execution** if optional scripts fail (Phase 5)
- **Detailed logging** with timestamps
- **Summary report** showing successful and failed scripts

## Individual Script Usage

If you need to run individual scripts manually:

### Week-Dependent Scripts

These scripts require week input:

```bash
# uploadPlayer.py
echo "2" | python uploadPlayer.py

# uploadPlayerProjections.py
echo "2" | python uploadPlayerProjections.py

# uploadPlayerLines.py (requires PlayerProps.csv)
echo "2" | python uploadPlayerLines.py

# uploadPlayerRecent.py
echo "2" | python uploadPlayerRecent.py
```

### Independent Scripts

These scripts run without user input:

```bash
python scrape_nfl_schedule.py
python uploadMatchup.py
python uploadPlayerList.py
python uploadDefense.py
python uploadPlayerAverages.py
python uploadDefenseAverage.py
python uploadAllDefenseAVG.py
python uploadMatchupRank.py
```

## Troubleshooting

### Common Issues

1. **"Script not found" error**

   - Ensure you're running from the `uploadFiles` directory
   - Check that all script files exist

2. **"Required CSV file not found"**

   - Ensure `my-app/public/PlayerProps.csv` exists for `uploadPlayerLines.py`
   - Or use `--skip-optional` to skip this script

3. **Database connection errors**

   - Verify your `.env` file has correct database credentials
   - Check that your database is accessible

4. **API key errors**
   - Ensure `SPORTSDATA_API_KEY` is set in your `.env` file
   - Verify the API key is valid and has sufficient quota

### Logs and Debugging

Use `--verbose` flag for detailed output:

```bash
python run_all_uploads.py --week 2 --verbose
```

This will show:

- Detailed output from each script
- Error messages and stack traces
- Progress information

## Best Practices

1. **Run weekly updates** on Tuesday mornings after games complete
2. **Schedule is one-time setup** - only run `--include-schedule` once per season
3. **Check logs** for any failed scripts and address issues
4. **Backup database** before major updates
5. **Test with `--phase`** for specific functionality

## File Dependencies

```
nfl_schedule.csv (generated by scrape_nfl_schedule.py)
    ↓
uploadMatchup.py
    ↓
uploadPlayerProjections.py, uploadPlayerRecent.py

player_stats table (populated by uploadPlayer.py)
    ↓
uploadPlayerAverages.py

general_defensive_stats, qb_defensive_stats (populated by uploadDefense.py)
    ↓
uploadDefenseAverage.py
    ↓
uploadAllDefenseAVG.py
    ↓
uploadPlayerProjections.py, uploadMatchupRank.py

PlayerProps.csv (external file)
    ↓
uploadPlayerLines.py
```

## Support

For issues or questions:

1. Check the error logs with `--verbose`
2. Verify all prerequisites are met
3. Test individual scripts to isolate issues
4. Check database connectivity and API keys
