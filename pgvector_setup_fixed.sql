-- NFL Vector Database Setup for Ollama (768-dimensional embeddings)
-- Step-by-step setup to avoid issues

-- First, ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS player_performance_embeddings CASCADE;
DROP TABLE IF EXISTS matchup_embeddings CASCADE;
DROP TABLE IF EXISTS team_performance_embeddings CASCADE;
DROP TABLE IF EXISTS historical_context_embeddings CASCADE;
DROP TABLE IF EXISTS ai_query_embeddings CASCADE;

-- Create vector tables with 768 dimensions for Ollama embeddings
CREATE TABLE player_performance_embeddings (
  id SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  position_name TEXT NOT NULL,
  team TEXT NOT NULL,
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  performance_summary TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE matchup_embeddings (
  id SERIAL PRIMARY KEY,
  team_name TEXT NOT NULL,
  opponent TEXT NOT NULL,
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  matchup_analysis TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_performance_embeddings (
  id SERIAL PRIMARY KEY,
  team_name TEXT NOT NULL,
  season INTEGER NOT NULL,
  performance_summary TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE historical_context_embeddings (
  id SERIAL PRIMARY KEY,
  context_type TEXT NOT NULL,
  season INTEGER NOT NULL,
  week INTEGER,
  context_summary TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_query_embeddings (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  query_type TEXT,
  embedding vector(768),
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create regular indexes first
CREATE INDEX player_performance_filter_idx 
ON player_performance_embeddings (season, week, position_name, team);

CREATE INDEX matchup_filter_idx 
ON matchup_embeddings (season, week, team_name);

CREATE INDEX ai_query_usage_idx 
ON ai_query_embeddings (query_type, last_used DESC);

-- Create HNSW vector indexes (these need the tables to exist first)
CREATE INDEX player_performance_embedding_idx 
ON player_performance_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX matchup_embedding_idx 
ON matchup_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX team_performance_embedding_idx 
ON team_performance_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX historical_context_embedding_idx 
ON historical_context_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX ai_query_embedding_idx 
ON ai_query_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all vector tables
CREATE TRIGGER update_player_performance_embeddings_updated_at 
BEFORE UPDATE ON player_performance_embeddings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matchup_embeddings_updated_at 
BEFORE UPDATE ON matchup_embeddings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_performance_embeddings_updated_at 
BEFORE UPDATE ON team_performance_embeddings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historical_context_embeddings_updated_at 
BEFORE UPDATE ON historical_context_embeddings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Similarity search functions
CREATE OR REPLACE FUNCTION find_similar_players(
  query_embedding vector(768),
  position_filter text DEFAULT NULL,
  season_filter int DEFAULT NULL,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  player_name text,
  position_name text,
  team text,
  season int,
  week int,
  performance_summary text,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.player_name,
    pe.position_name,
    pe.team,
    pe.season,
    pe.week,
    pe.performance_summary,
    (1 - (pe.embedding <=> query_embedding))::float as similarity_score
  FROM player_performance_embeddings pe
  WHERE 
    (position_filter IS NULL OR pe.position_name = position_filter)
    AND (season_filter IS NULL OR pe.season = season_filter)
  ORDER BY pe.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION find_similar_matchups(
  query_embedding vector(768),
  season_filter int DEFAULT NULL,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  team_name text,
  opponent text,
  season int,
  week int,
  matchup_analysis text,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.team_name,
    me.opponent,
    me.season,
    me.week,
    me.matchup_analysis,
    (1 - (me.embedding <=> query_embedding))::float as similarity_score
  FROM matchup_embeddings me
  WHERE 
    (season_filter IS NULL OR me.season = season_filter)
  ORDER BY me.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION find_cached_queries(
  query_embedding vector(768),
  similarity_threshold float DEFAULT 0.8,
  limit_count int DEFAULT 5
)
RETURNS TABLE (
  query_text text,
  response_text text,
  query_type text,
  similarity_score float,
  usage_count int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aqe.query_text,
    aqe.response_text,
    aqe.query_type,
    (1 - (aqe.embedding <=> query_embedding))::float as similarity_score,
    aqe.usage_count
  FROM ai_query_embeddings aqe
  WHERE (1 - (aqe.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY aqe.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Test that everything was created successfully
SELECT 
  'Tables created:' as status,
  count(*) as count
FROM information_schema.tables 
WHERE table_name LIKE '%embedding%';

SELECT 
  'Indexes created:' as status,
  count(*) as count
FROM pg_indexes 
WHERE tablename LIKE '%embedding%';

-- Show the created tables and their columns
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name LIKE '%embedding%'
ORDER BY table_name, ordinal_position;