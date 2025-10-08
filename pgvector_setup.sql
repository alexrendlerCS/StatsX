-- =====================================================
-- NFL Database pgvector Integration Plan
-- Enhanced AI-powered analytics with vector embeddings
-- =====================================================

-- Step 1: Enable pgvector extension
-- Run this in your Supabase SQL editor or psql client
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- VECTOR EMBEDDING TABLES
-- =====================================================

-- 1. Player Performance Embeddings
-- Stores semantic embeddings of player performance summaries
CREATE TABLE player_performance_embeddings (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position_id VARCHAR(10) REFERENCES positions(position_id),
    team_id VARCHAR(10) REFERENCES teams(team_id),
    season INTEGER NOT NULL,
    week INTEGER, -- NULL for season-long embeddings
    
    -- Performance summary text that was embedded
    performance_summary TEXT NOT NULL,
    
    -- Vector embedding (1536 dimensions for OpenAI ada-002, 384 for sentence-transformers)
    embedding vector(1536),
    
    -- Metadata for filtering
    stat_type VARCHAR(20) CHECK (stat_type IN ('weekly', 'season', 'recent_trend', 'matchup_analysis')),
    
    -- Performance metrics for quick filtering
    fantasy_points NUMERIC,
    yards_total INTEGER,
    touchdowns_total INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for efficient vector search
    UNIQUE(player_name, position_id, season, week, stat_type)
);

-- 2. Matchup Analysis Embeddings  
-- Stores semantic embeddings of matchup insights
CREATE TABLE matchup_embeddings (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position_id VARCHAR(10) REFERENCES positions(position_id),
    opponent_team VARCHAR(10) REFERENCES teams(team_id),
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    
    -- Matchup analysis text
    matchup_summary TEXT NOT NULL,
    
    -- Vector embedding
    embedding vector(1536),
    
    -- Matchup metrics
    projected_points NUMERIC,
    matchup_difficulty VARCHAR(20) CHECK (matchup_difficulty IN ('easy', 'medium', 'hard')),
    confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(player_name, opponent_team, week, season)
);

-- 3. Team Performance Embeddings
-- Stores semantic embeddings of team-level analysis
CREATE TABLE team_performance_embeddings (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(10) REFERENCES teams(team_id),
    position_group VARCHAR(10) NOT NULL, -- 'offense', 'defense', 'qb_defense', etc.
    season INTEGER NOT NULL,
    week INTEGER, -- NULL for season-long
    
    -- Team analysis summary
    performance_summary TEXT NOT NULL,
    
    -- Vector embedding
    embedding vector(1536),
    
    -- Team metrics
    points_allowed NUMERIC,
    yards_allowed INTEGER,
    ranking INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(team_id, position_group, season, week)
);

-- 4. Historical Context Embeddings
-- Stores embeddings of historical player narratives and trends
CREATE TABLE historical_context_embeddings (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    position_id VARCHAR(10) REFERENCES positions(position_id),
    
    -- Historical context text (career highlights, injury history, etc.)
    context_summary TEXT NOT NULL,
    
    -- Vector embedding
    embedding vector(1536),
    
    -- Context metadata
    context_type VARCHAR(30) CHECK (context_type IN ('career_summary', 'injury_history', 'breakout_analysis', 'regression_analysis', 'team_change_impact')),
    seasons_covered INTEGER[],
    relevance_score NUMERIC CHECK (relevance_score >= 0 AND relevance_score <= 1),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(player_name, context_type)
);

-- 5. AI Query Cache with Embeddings
-- Stores frequently asked questions and their embeddings for fast retrieval
CREATE TABLE ai_query_embeddings (
    id SERIAL PRIMARY KEY,
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    
    -- Response and metadata
    response_text TEXT NOT NULL,
    response_quality_score NUMERIC CHECK (response_quality_score >= 0 AND response_quality_score <= 1),
    
    -- Query classification
    query_type VARCHAR(30) CHECK (query_type IN ('player_analysis', 'matchup_prediction', 'start_sit_advice', 'trend_analysis', 'injury_impact', 'breakout_candidate')),
    positions_involved VARCHAR(20)[],
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate queries
    UNIQUE(query_text)
);

-- =====================================================
-- VECTOR INDEXES FOR PERFORMANCE
-- =====================================================

-- Create HNSW indexes for fast approximate nearest neighbor search
CREATE INDEX idx_player_performance_embedding ON player_performance_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_matchup_embedding ON matchup_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_team_performance_embedding ON team_performance_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_historical_context_embedding ON historical_context_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_ai_query_embedding ON ai_query_embeddings 
USING hnsw (query_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Traditional indexes for filtering
CREATE INDEX idx_player_perf_position_season ON player_performance_embeddings(position_id, season);
CREATE INDEX idx_player_perf_week ON player_performance_embeddings(week) WHERE week IS NOT NULL;
CREATE INDEX idx_matchup_week_season ON matchup_embeddings(week, season);
CREATE INDEX idx_team_perf_position ON team_performance_embeddings(position_group, season);
CREATE INDEX idx_ai_query_type ON ai_query_embeddings(query_type);
CREATE INDEX idx_ai_query_usage ON ai_query_embeddings(usage_count DESC, last_used DESC);

-- =====================================================
-- VECTOR SEARCH FUNCTIONS
-- =====================================================

-- Function to find similar player performances
CREATE OR REPLACE FUNCTION find_similar_players(
    query_embedding vector(1536),
    target_position VARCHAR(10) DEFAULT NULL,
    target_season INTEGER DEFAULT NULL,
    limit_count INTEGER DEFAULT 10,
    similarity_threshold NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
    player_name VARCHAR(255),
    position_id VARCHAR(10),
    season INTEGER,
    week INTEGER,
    performance_summary TEXT,
    similarity_score NUMERIC,
    fantasy_points NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ppe.player_name,
        ppe.position_id,
        ppe.season,
        ppe.week,
        ppe.performance_summary,
        1 - (ppe.embedding <=> query_embedding) as similarity_score,
        ppe.fantasy_points
    FROM player_performance_embeddings ppe
    WHERE (target_position IS NULL OR ppe.position_id = target_position)
      AND (target_season IS NULL OR ppe.season = target_season)
      AND (1 - (ppe.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ppe.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar matchups
CREATE OR REPLACE FUNCTION find_similar_matchups(
    query_embedding vector(1536),
    target_position VARCHAR(10) DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    player_name VARCHAR(255),
    opponent_team VARCHAR(10),
    week INTEGER,
    season INTEGER,
    matchup_summary TEXT,
    similarity_score NUMERIC,
    projected_points NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.player_name,
        me.opponent_team,
        me.week,
        me.season,
        me.matchup_summary,
        1 - (me.embedding <=> query_embedding) as similarity_score,
        me.projected_points
    FROM matchup_embeddings me
    WHERE (target_position IS NULL OR me.position_id = target_position)
    ORDER BY me.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached AI responses for similar queries
CREATE OR REPLACE FUNCTION find_similar_queries(
    query_embedding vector(1536),
    limit_count INTEGER DEFAULT 5,
    similarity_threshold NUMERIC DEFAULT 0.8
)
RETURNS TABLE (
    query_text TEXT,
    response_text TEXT,
    similarity_score NUMERIC,
    usage_count INTEGER,
    query_type VARCHAR(30)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aqe.query_text,
        aqe.response_text,
        1 - (aqe.query_embedding <=> query_embedding) as similarity_score,
        aqe.usage_count,
        aqe.query_type
    FROM ai_query_embeddings aqe
    WHERE (1 - (aqe.query_embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY aqe.query_embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_performance_embeddings_updated_at 
BEFORE UPDATE ON player_performance_embeddings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historical_context_embeddings_updated_at 
BEFORE UPDATE ON historical_context_embeddings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update query usage tracking
CREATE OR REPLACE FUNCTION update_query_usage()
RETURNS TRIGGER AS $$
BEGIN
    NEW.usage_count = OLD.usage_count + 1;
    NEW.last_used = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA GENERATION QUERIES
-- =====================================================

-- Query to generate performance summaries for embedding
-- Use this with your embedding service to populate the vector tables
SELECT 
    ps.player_name,
    ps.position_id,
    ps.team_id,
    ps.week,
    CASE 
        WHEN ps.position_id = 'QB' THEN
            FORMAT('Week %s: %s (%s) threw for %s yards, %s TDs, %s INTs with %s fantasy points against %s',
                ps.week, ps.player_name, ps.team_id, 
                COALESCE(ps.passing_yards, 0), COALESCE(ps.passing_tds, 0), 
                COALESCE(ps.interceptions, 0), COALESCE(ps.fpts, 0), ps.opponent)
        WHEN ps.position_id = 'RB' THEN
            FORMAT('Week %s: %s (%s) rushed for %s yards, %s TDs and caught %s passes for %s yards, %s TDs. Total: %s fantasy points vs %s',
                ps.week, ps.player_name, ps.team_id,
                COALESCE(ps.rushing_yards, 0), COALESCE(ps.rushing_tds, 0),
                COALESCE(ps.receptions, 0), COALESCE(ps.receiving_yards, 0), COALESCE(ps.receiving_tds, 0),
                COALESCE(ps.fpts, 0), ps.opponent)
        ELSE
            FORMAT('Week %s: %s (%s) caught %s passes for %s yards, %s TDs with %s fantasy points against %s',
                ps.week, ps.player_name, ps.team_id,
                COALESCE(ps.receptions, 0), COALESCE(ps.receiving_yards, 0), 
                COALESCE(ps.receiving_tds, 0), COALESCE(ps.fpts, 0), ps.opponent)
    END as performance_summary,
    ps.fpts,
    (COALESCE(ps.passing_yards, 0) + COALESCE(ps.rushing_yards, 0) + COALESCE(ps.receiving_yards, 0)) as total_yards,
    (COALESCE(ps.passing_tds, 0) + COALESCE(ps.rushing_tds, 0) + COALESCE(ps.receiving_tds, 0)) as total_touchdowns
FROM player_stats ps
WHERE ps.fpts IS NOT NULL AND ps.fpts > 0
ORDER BY ps.player_name, ps.week;

-- Grant necessary permissions (adjust user as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_ai_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_ai_user;