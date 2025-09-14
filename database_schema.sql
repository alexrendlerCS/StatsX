-- =====================================================
-- StatsX Database Schema
-- Complete database structure for NFL stats analysis
-- =====================================================

-- Drop existing tables if they exist (for clean recreation)
DROP TABLE IF EXISTS defensive_matchup_rankings CASCADE;
DROP TABLE IF EXISTS player_lines CASCADE;
DROP TABLE IF EXISTS weekly_leaders CASCADE;
DROP TABLE IF EXISTS players_to_watch CASCADE;
DROP TABLE IF EXISTS cold_players CASCADE;
DROP TABLE IF EXISTS hot_players CASCADE;
DROP TABLE IF EXISTS recent_player_stats CASCADE;
DROP TABLE IF EXISTS player_projections CASCADE;
DROP TABLE IF EXISTS all_defense_averages_qb CASCADE;
DROP TABLE IF EXISTS all_defense_averages CASCADE;
DROP TABLE IF EXISTS defense_averages_qb CASCADE;
DROP TABLE IF EXISTS defense_averages CASCADE;
DROP TABLE IF EXISTS player_averages CASCADE;
DROP TABLE IF EXISTS team_schedule CASCADE;
DROP TABLE IF EXISTS qb_defensive_stats CASCADE;
DROP TABLE IF EXISTS general_defensive_stats CASCADE;
DROP TABLE IF EXISTS nfl_historical_stats CASCADE;
DROP TABLE IF EXISTS player_stats CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS picks CASCADE;
DROP TABLE IF EXISTS player_list CASCADE;

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- Teams reference table
CREATE TABLE teams (
    team_id VARCHAR(10) PRIMARY KEY,
    abbreviation VARCHAR(10) NOT NULL,
    full_name VARCHAR(255) NOT NULL
);

-- Positions reference table
CREATE TABLE positions (
    position_id VARCHAR(10) PRIMARY KEY,
    position_name VARCHAR(255) NOT NULL
);

-- Main player stats table
CREATE TABLE player_stats (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255),
    position_id VARCHAR(10) NOT NULL,
    team_id VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    matchup VARCHAR(255),
    fpts INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    passing_attempts INTEGER DEFAULT 0,
    passing_yards INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    rushing_attempts INTEGER DEFAULT 0,
    rushing_yards INTEGER DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    receiving_yards INTEGER DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    targets INTEGER DEFAULT 0,
    snaps INTEGER,
    opponent VARCHAR(255),
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_name, team_id, week)
);

-- Historical NFL stats table (2015-2025)
CREATE TABLE nfl_historical_stats (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    player_id VARCHAR(50), -- Links to NFL data PlayerId
    position VARCHAR(10) NOT NULL,
    team VARCHAR(10) NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER, -- NULL for season totals (2015-2020)
    opponent VARCHAR(255),
    
    -- Basic Stats (matching current schema)
    passing_yds INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    passing_int INTEGER DEFAULT 0,
    rushing_yds INTEGER DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    receiving_yds INTEGER DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    targets INTEGER DEFAULT 0,
    fpts DECIMAL(8,2) DEFAULT 0,
    
    -- Advanced NFL Data Fields
    touch_carries INTEGER DEFAULT 0,
    touch_receptions INTEGER DEFAULT 0,
    total_touches INTEGER DEFAULT 0,
    reception_percentage DECIMAL(5,2) DEFAULT 0,
    red_zone_targets INTEGER DEFAULT 0,
    red_zone_touches INTEGER DEFAULT 0,
    goal_to_go INTEGER DEFAULT 0,
    return_tds INTEGER DEFAULT 0,
    fumble_tds INTEGER DEFAULT 0,
    two_point_conversions INTEGER DEFAULT 0,
    fumbles INTEGER DEFAULT 0,
    fantasy_points_against DECIMAL(8,2) DEFAULT 0,
    player_rank INTEGER DEFAULT 0,
    
    -- Projection Fields (for projected data)
    projected_points DECIMAL(8,2) DEFAULT 0,
    projected_rank INTEGER DEFAULT 0,
    projection_diff DECIMAL(8,2) DEFAULT 0,
    
    -- Data source tracking
    data_type VARCHAR(20) DEFAULT 'weekly', -- 'weekly', 'season', 'projected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(player_name, player_id, season, week, data_type)
);

-- =====================================================
-- 2. DEFENSE TABLES
-- =====================================================

-- General defensive stats (RB, WR, TE)
CREATE TABLE general_defensive_stats (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(10) NOT NULL,
    position_id VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    matchup VARCHAR(255),
    rushing_attempts INTEGER DEFAULT 0,
    total_rushing_yards INTEGER DEFAULT 0,
    avg_yards_per_carry DECIMAL(5,2) DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    targets INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    total_receiving_yards INTEGER DEFAULT 0,
    avg_yards_per_catch DECIMAL(5,2) DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, position_id, week)
);

-- QB defensive stats (separate table for QB-specific stats)
CREATE TABLE qb_defensive_stats (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    matchup VARCHAR(255),
    passing_attempts INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    passing_yards INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    rate DECIMAL(5,2) DEFAULT 0,
    rushing_attempts INTEGER DEFAULT 0,
    rushing_yards INTEGER DEFAULT 0,
    avg_rushing_yards DECIMAL(5,2) DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, week)
);

-- =====================================================
-- 3. SCHEDULE TABLES
-- =====================================================

-- Team schedule table
CREATE TABLE team_schedule (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    opponent_id VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, week)
);

-- =====================================================
-- 4. AVERAGES TABLES
-- =====================================================

-- Player averages (calculated from player_stats)
CREATE TABLE player_averages (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position_id VARCHAR(10) NOT NULL,
    team_id VARCHAR(10) NOT NULL,
    avg_passing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_completions DECIMAL(8,2) DEFAULT 0,
    avg_passing_yards DECIMAL(8,2) DEFAULT 0,
    avg_passing_tds DECIMAL(8,2) DEFAULT 0,
    avg_interceptions DECIMAL(8,2) DEFAULT 0,
    avg_rushing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_rushing_yards DECIMAL(8,2) DEFAULT 0,
    avg_rushing_tds DECIMAL(8,2) DEFAULT 0,
    avg_receptions DECIMAL(8,2) DEFAULT 0,
    avg_receiving_yards DECIMAL(8,2) DEFAULT 0,
    avg_receiving_tds DECIMAL(8,2) DEFAULT 0,
    avg_targets DECIMAL(8,2) DEFAULT 0,
    avg_snaps DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_name, position_id)
);

-- Defense averages (calculated from general_defensive_stats)
CREATE TABLE defense_averages (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(10) NOT NULL,
    position_id VARCHAR(10) NOT NULL,
    avg_rushing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_rushing_yards DECIMAL(8,2) DEFAULT 0,
    avg_yards_per_carry DECIMAL(5,2) DEFAULT 0,
    avg_rushing_tds DECIMAL(8,2) DEFAULT 0,
    avg_targets DECIMAL(8,2) DEFAULT 0,
    avg_receptions DECIMAL(8,2) DEFAULT 0,
    avg_receiving_yards DECIMAL(8,2) DEFAULT 0,
    avg_yards_per_catch DECIMAL(5,2) DEFAULT 0,
    avg_receiving_tds DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, position_id)
);

-- QB defense averages (calculated from qb_defensive_stats)
CREATE TABLE defense_averages_qb (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(10) NOT NULL,
    avg_passing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_completions DECIMAL(8,2) DEFAULT 0,
    avg_passing_yards DECIMAL(8,2) DEFAULT 0,
    avg_passing_tds DECIMAL(8,2) DEFAULT 0,
    avg_interceptions DECIMAL(8,2) DEFAULT 0,
    avg_rate DECIMAL(5,2) DEFAULT 0,
    avg_qb_rushing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_qb_rushing_yards DECIMAL(8,2) DEFAULT 0,
    avg_qb_avg_rushing_yards DECIMAL(5,2) DEFAULT 0,
    avg_qb_rushing_tds DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id)
);

-- League-wide defense averages (calculated from defense_averages)
CREATE TABLE all_defense_averages (
    id SERIAL PRIMARY KEY,
    position_id VARCHAR(10) NOT NULL,
    avg_rushing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_rushing_yards DECIMAL(8,2) DEFAULT 0,
    avg_yards_per_carry DECIMAL(5,2) DEFAULT 0,
    avg_rushing_tds DECIMAL(8,2) DEFAULT 0,
    avg_targets DECIMAL(8,2) DEFAULT 0,
    avg_receptions DECIMAL(8,2) DEFAULT 0,
    avg_receiving_yards DECIMAL(8,2) DEFAULT 0,
    avg_yards_per_catch DECIMAL(5,2) DEFAULT 0,
    avg_receiving_tds DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(position_id)
);

-- League-wide QB defense averages (calculated from defense_averages_qb)
CREATE TABLE all_defense_averages_qb (
    id INTEGER PRIMARY KEY DEFAULT 1,
    avg_passing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_completions DECIMAL(8,2) DEFAULT 0,
    avg_passing_yards DECIMAL(8,2) DEFAULT 0,
    avg_passing_tds DECIMAL(8,2) DEFAULT 0,
    avg_interceptions DECIMAL(8,2) DEFAULT 0,
    avg_rate DECIMAL(5,2) DEFAULT 0,
    avg_qb_rushing_attempts DECIMAL(8,2) DEFAULT 0,
    avg_qb_rushing_yards DECIMAL(8,2) DEFAULT 0,
    avg_qb_avg_rushing_yards DECIMAL(5,2) DEFAULT 0,
    avg_qb_rushing_tds DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. USER INTERACTION TABLES
-- =====================================================

-- Feedback table for user feedback
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Picks table for user-submitted picks
CREATE TABLE picks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    stat VARCHAR(255) NOT NULL,
    value DECIMAL(8,2) NOT NULL,
    over_under VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player list table for autocomplete suggestions
CREATE TABLE player_list (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. ANALYSIS TABLES
-- =====================================================

-- Recent player stats (last 3 weeks)
CREATE TABLE recent_player_stats (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position_id VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    team_id VARCHAR(10) NOT NULL,
    passing_attempts INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    passing_yards INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    rushing_attempts INTEGER DEFAULT 0,
    rushing_yards INTEGER DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    receiving_yards INTEGER DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    targets INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player projections
CREATE TABLE player_projections (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255),
    position VARCHAR(10) NOT NULL,
    opponent VARCHAR(10) NOT NULL,
    stat_key VARCHAR(50) NOT NULL,
    projection DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_name, normalized_name, position, opponent, stat_key)
);

-- Hot players (players performing above season average)
CREATE TABLE hot_players (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    stat VARCHAR(50) NOT NULL,
    recent_average DECIMAL(8,2) NOT NULL,
    season_average DECIMAL(8,2) NOT NULL,
    percentage_change DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cold players (players performing below season average)
CREATE TABLE cold_players (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    stat VARCHAR(50) NOT NULL,
    recent_average DECIMAL(8,2) NOT NULL,
    season_average DECIMAL(8,2) NOT NULL,
    percentage_change DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players to watch (players with significant performance changes)
CREATE TABLE players_to_watch (
    id SERIAL PRIMARY KEY,
    normalized_name VARCHAR(255) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    stat_to_display VARCHAR(50) NOT NULL,
    last_3_avg DECIMAL(8,2) NOT NULL,
    season_avg DECIMAL(8,2) NOT NULL,
    opponent VARCHAR(10) NOT NULL,
    matchup_type VARCHAR(50) NOT NULL,
    performance_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly leaders (top performers by position)
CREATE TABLE weekly_leaders (
    id SERIAL PRIMARY KEY,
    week INTEGER NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position_id VARCHAR(10) NOT NULL,
    stat_value INTEGER NOT NULL,
    matchup VARCHAR(255),
    rank INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Defensive matchup rankings
CREATE TABLE defensive_matchup_rankings (
    id SERIAL PRIMARY KEY,
    position VARCHAR(10) NOT NULL,
    team_id VARCHAR(10) NOT NULL,
    avg_stat DECIMAL(8,2) NOT NULL,
    yards_above_avg DECIMAL(8,2) NOT NULL,
    rank INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(position, team_id)
);

-- Player lines (betting lines/projections)
CREATE TABLE player_lines (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10),
    team_id VARCHAR(10),
    week INTEGER NOT NULL,
    opponent_id VARCHAR(10),
    projected_passing_attempts DECIMAL(8,2),
    projected_completions DECIMAL(8,2),
    projected_passing_yards DECIMAL(8,2),
    projected_passing_tds DECIMAL(8,2),
    projected_interceptions DECIMAL(8,2),
    projected_rushing_attempts DECIMAL(8,2),
    projected_rushing_yards DECIMAL(8,2),
    projected_rushing_tds DECIMAL(8,2),
    projected_receptions DECIMAL(8,2),
    projected_receiving_yards DECIMAL(8,2),
    projected_receiving_tds DECIMAL(8,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_name, week)
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- Player stats indexes
CREATE INDEX idx_player_stats_player_name ON player_stats(player_name);
CREATE INDEX idx_player_stats_position_id ON player_stats(position_id);
CREATE INDEX idx_player_stats_team_id ON player_stats(team_id);
CREATE INDEX idx_player_stats_week ON player_stats(week);
CREATE INDEX idx_player_stats_normalized_name ON player_stats(normalized_name);

-- Historical stats indexes
CREATE INDEX idx_nfl_historical_player_season ON nfl_historical_stats(player_name, season);
CREATE INDEX idx_nfl_historical_player_week ON nfl_historical_stats(player_name, season, week);
CREATE INDEX idx_nfl_historical_position_season ON nfl_historical_stats(position, season);
CREATE INDEX idx_nfl_historical_team_season ON nfl_historical_stats(team, season);
CREATE INDEX idx_nfl_historical_season_week ON nfl_historical_stats(season, week);
CREATE INDEX idx_nfl_historical_player_id ON nfl_historical_stats(player_id);
CREATE INDEX idx_nfl_historical_data_type ON nfl_historical_stats(data_type);
CREATE INDEX idx_nfl_historical_fpts ON nfl_historical_stats(fpts DESC);
CREATE INDEX idx_nfl_historical_player_rank ON nfl_historical_stats(player_rank);
CREATE INDEX idx_nfl_historical_total_touches ON nfl_historical_stats(total_touches DESC);
CREATE INDEX idx_nfl_historical_receiving_yds ON nfl_historical_stats(receiving_yds DESC);
CREATE INDEX idx_nfl_historical_rushing_yds ON nfl_historical_stats(rushing_yds DESC);
CREATE INDEX idx_nfl_historical_passing_yds ON nfl_historical_stats(passing_yds DESC);
CREATE INDEX idx_nfl_historical_position_week_fpts ON nfl_historical_stats(position, week, fpts DESC);
CREATE INDEX idx_nfl_historical_season_position_rank ON nfl_historical_stats(season, position, player_rank);
CREATE INDEX idx_nfl_historical_team_week ON nfl_historical_stats(team, season, week);

-- Defense stats indexes
CREATE INDEX idx_general_defensive_stats_team_id ON general_defensive_stats(team_id);
CREATE INDEX idx_general_defensive_stats_position_id ON general_defensive_stats(position_id);
CREATE INDEX idx_general_defensive_stats_week ON general_defensive_stats(week);
CREATE INDEX idx_qb_defensive_stats_team_id ON qb_defensive_stats(team_id);
CREATE INDEX idx_qb_defensive_stats_week ON qb_defensive_stats(week);

-- Schedule indexes
CREATE INDEX idx_team_schedule_team_id ON team_schedule(team_id);
CREATE INDEX idx_team_schedule_week ON team_schedule(week);

-- Averages indexes
CREATE INDEX idx_player_averages_player_name ON player_averages(player_name);
CREATE INDEX idx_player_averages_position_id ON player_averages(position_id);
CREATE INDEX idx_defense_averages_team_id ON defense_averages(team_id);
CREATE INDEX idx_defense_averages_position_id ON defense_averages(position_id);
CREATE INDEX idx_defense_averages_qb_team_id ON defense_averages_qb(team_id);

-- Analysis indexes
CREATE INDEX idx_recent_player_stats_player_name ON recent_player_stats(player_name);
CREATE INDEX idx_recent_player_stats_week ON recent_player_stats(week);
CREATE INDEX idx_player_projections_player_name ON player_projections(player_name);
CREATE INDEX idx_hot_players_player_name ON hot_players(player_name);
CREATE INDEX idx_cold_players_player_name ON cold_players(player_name);
CREATE INDEX idx_players_to_watch_player_name ON players_to_watch(player_name);
CREATE INDEX idx_weekly_leaders_week ON weekly_leaders(week);
CREATE INDEX idx_weekly_leaders_position_id ON weekly_leaders(position_id);
CREATE INDEX idx_defensive_matchup_rankings_position ON defensive_matchup_rankings(position);
CREATE INDEX idx_player_lines_player_name ON player_lines(player_name);
CREATE INDEX idx_player_lines_week ON player_lines(week);

-- =====================================================
-- 7. INSERT REFERENCE DATA
-- =====================================================

-- Insert NFL teams
INSERT INTO teams (team_id, abbreviation, full_name) VALUES
('ARI', 'ARI', 'Arizona Cardinals'),
('ATL', 'ATL', 'Atlanta Falcons'),
('BAL', 'BAL', 'Baltimore Ravens'),
('BUF', 'BUF', 'Buffalo Bills'),
('CAR', 'CAR', 'Carolina Panthers'),
('CHI', 'CHI', 'Chicago Bears'),
('CIN', 'CIN', 'Cincinnati Bengals'),
('CLE', 'CLE', 'Cleveland Browns'),
('DAL', 'DAL', 'Dallas Cowboys'),
('DEN', 'DEN', 'Denver Broncos'),
('DET', 'DET', 'Detroit Lions'),
('GB', 'GB', 'Green Bay Packers'),
('HOU', 'HOU', 'Houston Texans'),
('IND', 'IND', 'Indianapolis Colts'),
('JAC', 'JAC', 'Jacksonville Jaguars'),
('KC', 'KC', 'Kansas City Chiefs'),
('LV', 'LV', 'Las Vegas Raiders'),
('LAC', 'LAC', 'Los Angeles Chargers'),
('LAR', 'LAR', 'Los Angeles Rams'),
('MIA', 'MIA', 'Miami Dolphins'),
('MIN', 'MIN', 'Minnesota Vikings'),
('NE', 'NE', 'New England Patriots'),
('NO', 'NO', 'New Orleans Saints'),
('NYG', 'NYG', 'New York Giants'),
('NYJ', 'NYJ', 'New York Jets'),
('PHI', 'PHI', 'Philadelphia Eagles'),
('PIT', 'PIT', 'Pittsburgh Steelers'),
('SF', 'SF', 'San Francisco 49ers'),
('SEA', 'SEA', 'Seattle Seahawks'),
('TB', 'TB', 'Tampa Bay Buccaneers'),
('TEN', 'TEN', 'Tennessee Titans'),
('WAS', 'WAS', 'Washington Commanders');

-- Insert positions
INSERT INTO positions (position_id, position_name) VALUES
('QB', 'Quarterback'),
('RB', 'Running Back'),
('WR', 'Wide Receiver'),
('TE', 'Tight End');

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE player_stats IS 'Main table storing individual player game statistics';
COMMENT ON TABLE nfl_historical_stats IS 'Historical NFL player statistics from 2015-2025, including weekly stats, season totals, and projections';
COMMENT ON TABLE general_defensive_stats IS 'Defensive statistics against RB, WR, TE positions';
COMMENT ON TABLE qb_defensive_stats IS 'Defensive statistics specifically against QB position';
COMMENT ON TABLE team_schedule IS 'NFL team schedule with weekly opponents';
COMMENT ON TABLE player_averages IS 'Calculated season averages for each player';
COMMENT ON TABLE defense_averages IS 'Calculated defensive averages by team and position';
COMMENT ON TABLE defense_averages_qb IS 'Calculated QB-specific defensive averages by team';
COMMENT ON TABLE all_defense_averages IS 'League-wide defensive averages by position';
COMMENT ON TABLE all_defense_averages_qb IS 'League-wide QB defensive averages';
COMMENT ON TABLE recent_player_stats IS 'Player statistics from last 3 weeks for trend analysis';
COMMENT ON TABLE player_projections IS 'Calculated player performance projections';
COMMENT ON TABLE hot_players IS 'Players performing above their season average';
COMMENT ON TABLE cold_players IS 'Players performing below their season average';
COMMENT ON TABLE players_to_watch IS 'Players with significant performance changes to monitor';
COMMENT ON TABLE weekly_leaders IS 'Top performers by position for each week';
COMMENT ON TABLE defensive_matchup_rankings IS 'Defensive team rankings by position';
COMMENT ON TABLE player_lines IS 'Betting lines and projections for player props';
COMMENT ON TABLE feedback IS 'User feedback and suggestions';
COMMENT ON TABLE picks IS 'User-submitted player picks and predictions';
COMMENT ON TABLE player_list IS 'Complete list of players for autocomplete functionality';

-- =====================================================
-- Schema creation complete!
-- =====================================================

-- Verify tables were created successfully
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN (
        'player_stats', 'nfl_historical_stats', 'teams', 'positions', 'general_defensive_stats',
        'qb_defensive_stats', 'team_schedule', 'player_averages',
        'defense_averages', 'defense_averages_qb', 'all_defense_averages',
        'all_defense_averages_qb', 'recent_player_stats', 'player_projections',
        'hot_players', 'cold_players', 'players_to_watch', 'weekly_leaders',
        'defensive_matchup_rankings', 'player_lines'
    )
GROUP BY table_name
ORDER BY table_name; 