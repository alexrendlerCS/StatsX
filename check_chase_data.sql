-- Query to check Ja'Marr Chase's 2023 Week 13 data
-- This will help us verify the correct receptions value

SELECT 
    player_name,
    season,
    week,
    opponent,
    receptions,
    receiving_yards,
    receiving_tds,
    targets,
    fpts,
    position,
    team
FROM nfl_historical_stats 
WHERE player_name ILIKE '%jamar%chase%' 
    OR player_name ILIKE '%ja%marr%chase%'
    OR player_name ILIKE '%chase%jamar%'
ORDER BY season DESC, week ASC;

-- Alternative query to find Chase by different name variations
SELECT 
    player_name,
    season,
    week,
    opponent,
    receptions,
    receiving_yards,
    receiving_tds,
    targets,
    fpts
FROM nfl_historical_stats 
WHERE (
    player_name ILIKE '%chase%' 
    AND (
        player_name ILIKE '%jamar%' 
        OR player_name ILIKE '%ja%marr%'
        OR player_name ILIKE '%marr%'
    )
)
    AND season = 2023
    AND week = 13;

-- Query to see all WRs for that week to compare
SELECT 
    player_name,
    team,
    opponent,
    receptions,
    receiving_yards,
    receiving_tds,
    targets,
    fpts
FROM nfl_historical_stats 
WHERE position = 'WR'
    AND season = 2023
    AND week = 13
    AND receptions > 10
ORDER BY receptions DESC;
