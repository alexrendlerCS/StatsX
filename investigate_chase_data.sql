-- Query to get ALL Ja'Marr Chase data to investigate the receptions issue
-- This will help us see if there are multiple rows or data inconsistencies

-- Get all Chase data with different name variations
SELECT 
    id,
    player_name,
    player_id,
    position,
    team,
    season,
    week,
    opponent,
    receptions,
    receiving_yards,
    receiving_tds,
    targets,
    fpts,
    reception_percentage,
    data_type,
    created_at,
    updated_at
FROM nfl_historical_stats 
WHERE (
    player_name ILIKE '%jamar%chase%' 
    OR player_name ILIKE '%ja%marr%chase%'
    OR player_name ILIKE '%chase%jamar%'
    OR player_name ILIKE '%chase%'
)
ORDER BY season DESC, week ASC;

-- Specifically check 2023 Week 13 data
SELECT 
    id,
    player_name,
    player_id,
    team,
    opponent,
    receptions,
    receiving_yards,
    receiving_tds,
    targets,
    fpts,
    reception_percentage,
    data_type,
    created_at
FROM nfl_historical_stats 
WHERE (
    player_name ILIKE '%jamar%chase%' 
    OR player_name ILIKE '%ja%marr%chase%'
    OR player_name ILIKE '%chase%jamar%'
)
    AND season = 2023
    AND week = 13;

-- Check for duplicate entries for Chase in 2023 Week 13
SELECT 
    COUNT(*) as row_count,
    player_name,
    season,
    week,
    opponent,
    SUM(receptions) as total_receptions,
    SUM(targets) as total_targets,
    SUM(receiving_yards) as total_yards,
    SUM(fpts) as total_fpts
FROM nfl_historical_stats 
WHERE (
    player_name ILIKE '%jamar%chase%' 
    OR player_name ILIKE '%ja%marr%chase%'
    OR player_name ILIKE '%chase%jamar%'
)
    AND season = 2023
    AND week = 13
GROUP BY player_name, season, week, opponent;

-- Check if there are any data validation issues
SELECT 
    player_name,
    receptions,
    targets,
    receiving_yards,
    receiving_tds,
    fpts,
    CASE 
        WHEN receptions > targets THEN 'ERROR: Receptions > Targets'
        ELSE 'OK'
    END as data_check
FROM nfl_historical_stats 
WHERE (
    player_name ILIKE '%jamar%chase%' 
    OR player_name ILIKE '%ja%marr%chase%'
    OR player_name ILIKE '%chase%jamar%'
)
    AND season = 2023
    AND week = 13;
