// Ollama Integration Setup
// This file contains the configuration and utilities for integrating with Ollama

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

export const ollamaConfig: OllamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama2', // You can change this to your preferred model
  timeout: 30000, // 30 seconds timeout
};

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Send a request to Ollama API
 * @param prompt The prompt to send to the AI
 * @param options Additional options for the request
 * @returns Promise with the AI response
 */
export async function queryOllama(
  prompt: string, 
  options: Partial<OllamaRequest['options']> = {}
): Promise<string> {
  const requestBody: OllamaRequest = {
    model: ollamaConfig.model,
    prompt: enhancePromptForNFL(prompt),
    stream: false,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 500,
      ...options,
    },
  };

  try {
    const response = await fetch(`${ollamaConfig.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(ollamaConfig.timeout),
    });

    if (!response.ok) {
      // Attempt to include any body returned by the server to help debugging (404s often include hints)
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (e) {
        bodyText = '<could not read response body>';
      }
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${bodyText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;

  } catch (error) {
    console.error('Error querying Ollama:', error);
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        throw new Error('AI request timed out. Please try again.');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Could not connect to AI service. Make sure Ollama is running.');
      }
    }
    
    throw new Error('Failed to get AI response');
  }
}

/**
 * Enhance the user prompt with NFL context and database schema information
 * @param userPrompt The original user prompt
 * @returns Enhanced prompt with context
 */
function enhancePromptForNFL(userPrompt: string): string {
  const systemContext = `
You are an NFL statistics AI assistant with access to a comprehensive NFL database. 

Database Schema Context:
- player_stats: Contains weekly player performance (passing_yards, rushing_yards, receiving_yards, etc.)
- weekly_leaders: Top performers by position each week
- hot_players & cold_players: Trending players based on recent performance
- defense_averages: Team defensive statistics and rankings
- matchup_rankings: Defensive matchups by position
- players_to_watch: Players with favorable upcoming matchups
- team_schedule: Game schedules and matchups

Available Data:
- Current season player statistics
- Team defensive rankings
- Matchup analysis and predictions
- Player trends and performance patterns
- Fantasy football relevant metrics

Guidelines:
- Provide specific, data-driven insights
- Focus on actionable fantasy football advice when relevant
- Mention specific players, stats, or matchups when possible
- Keep responses concise but informative
- If you need specific data, suggest what the user should look for

User Question: ${userPrompt}

Please provide a helpful response based on NFL statistics and fantasy football insights:`;

  return systemContext;
}

/**
 * Check if Ollama service is available
 * @returns Promise<boolean> indicating if Ollama is running
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    // Try the common endpoints Ollama exposes. Some versions use /api/tags, others /api/models
    const candidates = ['/api/tags', '/api/models', '/api/list'];
    for (const path of candidates) {
      try {
        const resp = await fetch(`${ollamaConfig.baseUrl}${path}`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        if (resp.ok) return true;
      } catch (e) {
        // continue to next candidate
      }
    }
    return false;
  } catch (error) {
    console.log('Ollama health check failed:', error);
    return false;
  }
}

/**
 * Get list of available models in Ollama
 * @returns Promise with array of model names
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    // Try multiple endpoints and handle a couple of response shapes
    const tryEndpoints = [`${ollamaConfig.baseUrl}/api/tags`, `${ollamaConfig.baseUrl}/api/models`];
    for (const url of tryEndpoints) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        // /api/tags -> { models: [{ name: 'llama2' }, ...] }
        if (Array.isArray(data.models)) return data.models.map((m: any) => m.name);
        // /api/models -> maybe returns an array of strings or objects
        if (Array.isArray(data)) {
          if (typeof data[0] === 'string') return data as string[];
          if (data[0]?.name) return data.map((m: any) => m.name);
        }
      } catch (e) {
        // ignore and try next
      }
    }
    throw new Error('Failed to fetch models from Ollama');
  } catch (error) {
    console.error('Error fetching available models:', error);
    return [];
  }
}