// Vector Database Integration for NFL AI Analytics
// This file handles embedding generation and vector similarity searches

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for vector operations
export interface PlayerPerformanceEmbedding {
  id?: number;
  player_name: string;
  position_name: string;
  team: string;
  season: number;
  week?: number;
  performance_summary: string;
  embedding?: number[];
  stat_type?: 'weekly' | 'season' | 'recent_trend' | 'matchup_analysis';
  fantasy_points?: number;
  yards_total?: number;
  touchdowns_total?: number;
}

export interface MatchupEmbedding {
  id?: number;
  team_name: string;
  opponent: string;
  week: number;
  season: number;
  matchup_analysis: string;
  embedding?: number[];
}

export interface TeamPerformanceEmbedding {
  id?: number;
  team_name: string;
  season: number;
  performance_summary: string;
  embedding?: number[];
}

export interface HistoricalContextEmbedding {
  id?: number;
  context_type: string;
  season: number;
  week?: number;
  context_summary: string;
  embedding?: number[];
}

export interface AIQueryEmbedding {
  id?: number;
  query_text: string;
  response_text: string;
  query_type?: string;
  embedding?: number[];
  usage_count?: number;
  last_used?: string;
}

export class NFLVectorDatabase {
  private supabase: SupabaseClient;
  private embeddingCache: Map<string, number[]> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private readonly VECTOR_DIMENSION = parseInt(process.env.VECTOR_DIMENSION || '768');

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Generate embeddings using Ollama or OpenAI
   * Prioritizes Ollama for development, falls back to OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = `embedding:${text.substring(0, 100)}`;
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      // Option 1: Ollama Embeddings (for development)
      if (process.env.AI_PROVIDER === 'ollama' || !process.env.OPENAI_API_KEY) {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
        
        const response = await fetch(`${ollamaUrl}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: embeddingModel,
            prompt: text
          })
        });

        if (response.ok) {
          const data = await response.json();
          const embedding = data.embedding;
          
          // Cache the result
          this.embeddingCache.set(cacheKey, embedding);
          setTimeout(() => this.embeddingCache.delete(cacheKey), this.CACHE_TTL);
          
          return embedding;
        }
      }

      // Option 2: OpenAI Embeddings API (fallback)
      if (process.env.OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: text,
            model: 'text-embedding-ada-002'
          })
        });

        if (response.ok) {
          const data = await response.json();
          const embedding = data.data[0].embedding;
          
          // Cache the result
          this.embeddingCache.set(cacheKey, embedding);
          setTimeout(() => this.embeddingCache.delete(cacheKey), this.CACHE_TTL);
          
          return embedding;
        }
      }

      // If we get here, no embedding service worked
      throw new Error('No embedding service available');

    } catch (error) {
      console.error('Error generating embedding:', error);
      
      // Return zero vector as fallback (768 dimensions for Ollama)
      console.warn('Using zero vector fallback - embeddings will not work properly');
      return new Array(this.VECTOR_DIMENSION).fill(0);
    }
  }

  /**
   * Store player performance embedding
   */
  async storePlayerPerformance(performance: PlayerPerformanceEmbedding): Promise<void> {
    if (!performance.embedding) {
      performance.embedding = await this.generateEmbedding(performance.performance_summary);
    }

    const { error } = await this.supabase
      .from('player_performance_embeddings')
      .insert({
        player_name: performance.player_name,
        position_name: performance.position_name,
        team: performance.team,
        season: performance.season,
        week: performance.week,
        performance_summary: performance.performance_summary,
        embedding: performance.embedding
      });

    if (error) {
      throw new Error(`Failed to store player performance: ${error.message}`);
    }
  }

  /**
   * Find similar players based on performance characteristics
   */
  async findSimilarPlayers(
    query: string,
    position?: string,
    season?: number,
    limit: number = 10
  ): Promise<PlayerPerformanceEmbedding[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const { data, error } = await this.supabase
      .rpc('find_similar_players', {
        query_embedding: queryEmbedding,
        position_filter: position,
        season_filter: season,
        limit_count: limit
      });

    if (error) {
      throw new Error(`Failed to find similar players: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Store matchup analysis embedding
   */
  async storeMatchupAnalysis(matchup: MatchupEmbedding): Promise<void> {
    if (!matchup.embedding) {
      matchup.embedding = await this.generateEmbedding(matchup.matchup_analysis);
    }

    const { error } = await this.supabase
      .from('matchup_embeddings')
      .insert({
        team_name: matchup.team_name,
        opponent: matchup.opponent,
        season: matchup.season,
        week: matchup.week,
        matchup_analysis: matchup.matchup_analysis,
        embedding: matchup.embedding
      });

    if (error) {
      throw new Error(`Failed to store matchup analysis: ${error.message}`);
    }
  }

  /**
   * Find similar matchup situations
   */
  async findSimilarMatchups(
    query: string,
    season?: number,
    limit: number = 10
  ): Promise<MatchupEmbedding[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const { data, error } = await this.supabase
      .rpc('find_similar_matchups', {
        query_embedding: queryEmbedding,
        season_filter: season,
        limit_count: limit
      });

    if (error) {
      throw new Error(`Failed to find similar matchups: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Cache AI query and response for future similarity matching
   */
  async cacheQuery(
    query: string,
    response: string,
    queryType?: string
  ): Promise<void> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Check if similar query already exists
    const existingSimilar = await this.findSimilarQueries(query, 3, 0.9);
    
    if (existingSimilar.length > 0) {
      // Update existing similar query
      const existing = existingSimilar[0];
      const { error } = await this.supabase
        .from('ai_query_embeddings')
        .update({
          usage_count: (existing.usage_count || 0) + 1,
          last_used: new Date().toISOString(),
          response_text: response // Update with latest response
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Failed to update cached query:', error);
      }
    } else {
      // Insert new query
      const { error } = await this.supabase
        .from('ai_query_embeddings')
        .insert({
          query_text: query,
          response_text: response,
          query_type: queryType,
          embedding: queryEmbedding,
          usage_count: 1,
          last_used: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to cache query:', error);
      }
    }
  }

  /**
   * Find similar cached queries
   */
  async findSimilarQueries(
    query: string,
    limit: number = 5,
    threshold: number = 0.8
  ): Promise<AIQueryEmbedding[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const { data, error } = await this.supabase
      .rpc('find_cached_queries', {
        query_embedding: queryEmbedding,
        similarity_threshold: threshold,
        limit_count: limit
      });

    if (error) {
      throw new Error(`Failed to find similar queries: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Populate player embeddings from existing NFL data
   */
  async populatePlayerEmbeddings(
    season: number = 2025,
    batchSize: number = 50
  ): Promise<void> {
    try {
      // Get sample player data from your existing tables
      const { data: players, error } = await this.supabase
        .from('player_stats')
        .select(`
          player_name,
          position_id,
          team_id,
          week,
          fpts,
          passing_yards,
          rushing_yards,
          receiving_yards,
          passing_tds,
          rushing_tds,
          receiving_tds
        `)
        .eq('season', season)
        .limit(batchSize);

      if (error) {
        throw new Error(`Failed to fetch player data: ${error.message}`);
      }

      if (!players || players.length === 0) {
        console.log('No player data found for embedding generation');
        return;
      }

      console.log(`Processing ${players.length} players for embedding generation...`);

      // Process in smaller batches to avoid overwhelming the embedding service
      for (let i = 0; i < players.length; i += 10) {
        const batch = players.slice(i, i + 10);
        
        for (const player of batch) {
          try {
            // Create performance summary
            const summary = this.createPlayerPerformanceSummary(player);
            
            // Store the embedding
            await this.storePlayerPerformance({
              player_name: player.player_name,
              position_name: player.position_id,
              team: player.team_id,
              season: season,
              week: player.week,
              performance_summary: summary
            });

            console.log(`✅ Processed ${player.player_name} (${player.position_id})`);
          } catch (playerError) {
            console.error(`❌ Failed to process ${player.player_name}:`, playerError);
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Player embedding population completed');
    } catch (error) {
      console.error('❌ Failed to populate player embeddings:', error);
      throw error;
    }
  }

  /**
   * Enhanced AI query with vector similarity search
   */
  async enhancedAIQuery(query: string): Promise<string> {
    try {
      // Check if we have similar cached queries first
      const cachedQueries = await this.findSimilarQueries(query, 3, 0.8);
      
      if (cachedQueries.length > 0) {
        console.log('Found cached similar query, using cached response');
        
        // Update usage count for the cached query
        const cachedQuery = cachedQueries[0];
        await this.supabase
          .from('ai_query_embeddings')
          .update({
            usage_count: (cachedQuery.usage_count || 0) + 1,
            last_used: new Date().toISOString()
          })
          .eq('id', cachedQuery.id);
        
        return cachedQuery.response_text;
      }

      // If no cached response, enhance the query with vector search context
      let contextualInfo = '';
      
      try {
        // Search for relevant players based on the query
        const relevantPlayers = await this.findSimilarPlayers(query, undefined, 2025, 5);
        if (relevantPlayers.length > 0) {
          contextualInfo += '\nRelevant player information:\n';
          relevantPlayers.forEach(player => {
            contextualInfo += `- ${player.player_name} (${player.position_name}, ${player.team}): ${player.performance_summary}\n`;
          });
        }

        // Search for relevant matchups
        const relevantMatchups = await this.findSimilarMatchups(query, 2025, 3);
        if (relevantMatchups.length > 0) {
          contextualInfo += '\nRelevant matchup information:\n';
          relevantMatchups.forEach(matchup => {
            contextualInfo += `- ${matchup.team_name} vs ${matchup.opponent}: ${matchup.matchup_analysis}\n`;
          });
        }
      } catch (searchError) {
        console.log('Vector search failed, proceeding without context:', searchError);
      }

      // Generate enhanced prompt with context
      const enhancedPrompt = `
You are an NFL fantasy football analyst. Answer the following question with specific insights and recommendations.

User Question: ${query}
${contextualInfo}

Provide a comprehensive answer based on the available data and current NFL trends.`;

      // Use Ollama to generate the response
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
          prompt: enhancedPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.response;
      
      // Cache the query and response for future use
      await this.cacheQuery(query, aiResponse, 'enhanced_query');
      
      return aiResponse;
      
    } catch (error) {
      console.error('Enhanced AI query failed:', error);
      throw error;
    }
  }

  /**
   * Create a natural language performance summary for a player
   */
  private createPlayerPerformanceSummary(player: any): string {
    const parts = [];
    
    parts.push(`${player.player_name} (${player.position_id})`);
    
    if (player.fpts) {
      parts.push(`scored ${player.fpts} fantasy points`);
    }
    
    if (player.passing_yards > 0) {
      parts.push(`${player.passing_yards} passing yards`);
    }
    
    if (player.rushing_yards > 0) {
      parts.push(`${player.rushing_yards} rushing yards`);
    }
    
    if (player.receiving_yards > 0) {
      parts.push(`${player.receiving_yards} receiving yards`);
    }
    
    const totalTds = (player.passing_tds || 0) + (player.rushing_tds || 0) + (player.receiving_tds || 0);
    if (totalTds > 0) {
      parts.push(`${totalTds} touchdowns`);
    }
    
    parts.push(`in week ${player.week}`);
    
    return parts.join(', ');
  }
}

// Export a singleton instance
export const nflVectorDB = new NFLVectorDatabase();