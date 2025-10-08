# AI Insights Setup Guide

The AI Insights page provides an intelligent chat interface to analyze your NFL statistics database using Ollama for local AI processing.

## Features

- **Smart Chat Interface**: Natural language queries about NFL statistics
- **Database Integration**: Direct access to your NFL data for real-time insights  
- **Fantasy Football Advice**: Get personalized recommendations based on data
- **Trend Analysis**: Identify hot/cold players and emerging patterns
- **Matchup Analysis**: Detailed breakdowns of upcoming games

## Quick Setup (Placeholder Mode)

The AI Insights page works immediately with smart placeholder responses that demonstrate the intended functionality. No setup required!

## Full AI Setup with Ollama

### 1. Install Ollama

```bash
# Visit https://ollama.ai/ and download the installer
# Or use package managers:

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Download a Model

```bash
# Download Llama 2 (recommended for general use)
ollama pull llama2

# Or try other models:
ollama pull codellama    # Good for technical queries
ollama pull mistral      # Fast and efficient
ollama pull llama2:13b   # Larger model for better responses
```

### 3. Start Ollama Service

```bash
# Start the Ollama server
ollama serve

# The service runs on http://localhost:11434 by default
```

### 4. Configure Environment Variables

Add to your `.env.local` file:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

### 5. Restart Your Application

```bash
npm run dev
```

The AI Insights page will automatically detect Ollama and switch from placeholder mode to full AI mode!

## Usage Examples

Try these sample queries in the AI chat:

- "Who are the top performing QBs this week?"
- "Which RBs have the best matchups for fantasy?"
- "Show me trending wide receivers"
- "What defensive matchups should I target?"
- "Give me sleeper picks for this week"
- "Compare [Player A] vs [Player B] performance"
- "What are the key injury impacts this week?"

## Technical Details

### Database Access
The AI has context about your database schema including:
- `player_stats` - Weekly performance data
- `weekly_leaders` - Top performers by position
- `hot_players` & `cold_players` - Trending players
- `defense_averages` - Team defensive statistics
- `matchup_rankings` - Defensive matchup analysis

### Response Processing
- **Ollama Mode**: Full AI processing with database context
- **Placeholder Mode**: Smart template responses based on keywords
- **Fallback**: Graceful degradation if Ollama is unavailable

### Performance
- Response time: 2-5 seconds with Ollama
- Model memory: Retains conversation context
- Error handling: Automatic fallback to placeholder mode

## Troubleshooting

### Ollama Not Working?
1. Check if Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify model is downloaded: `ollama list`  
3. Check server logs: `ollama logs`

### Slow Responses?
1. Try a smaller model: `ollama pull llama2:7b`
2. Increase timeout in `lib/ollama.ts`
3. Use GPU acceleration if available

### Connection Issues?
1. Ensure port 11434 is not blocked
2. Check `OLLAMA_BASE_URL` in environment variables
3. Verify network connectivity to Ollama service

## Model Recommendations

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `llama2:7b` | 3.8GB | Fast | Good | Quick queries |
| `llama2` | 3.8GB | Fast | Good | General use |
| `llama2:13b` | 7.3GB | Medium | Better | Detailed analysis |
| `codellama` | 3.8GB | Fast | Good | Technical queries |
| `mistral` | 4.1GB | Very Fast | Good | Speed priority |

## Future Enhancements

- Voice input/output
- Data visualization generation
- Multi-model ensemble responses
- Custom fine-tuned models for NFL data
- Integration with external APIs (weather, injuries, etc.)