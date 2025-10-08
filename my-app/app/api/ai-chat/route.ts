import { NextRequest, NextResponse } from 'next/server';
import { queryOllama, checkOllamaHealth } from '@/lib/ollama';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if Ollama is available
    const isOllamaAvailable = await checkOllamaHealth();
    
    let response: string;
    
    if (isOllamaAvailable) {
      try {
        // Use Ollama for AI response
        response = await queryOllama(message);
      } catch (ollamaError) {
        console.error('Ollama query failed:', ollamaError);
        // Fallback to placeholder if Ollama fails
        response = generatePlaceholderResponse(message);
      }
    } else {
      // Ollama not available, use smart placeholder
      response = generatePlaceholderResponse(message);
    }

    return NextResponse.json({ 
      response,
      aiProvider: isOllamaAvailable ? 'ollama' : 'placeholder'
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

// Placeholder function until Ollama is set up
function generatePlaceholderResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('qb') || lowerMessage.includes('quarterback')) {
    return "Based on current stats, I'd recommend looking at quarterbacks with strong recent performances. Once I'm connected to Ollama, I'll be able to provide real-time analysis of QB stats, matchups, and trends from your database.";
  }
  
  if (lowerMessage.includes('rb') || lowerMessage.includes('running back')) {
    return "Running backs with favorable matchups this week would be great targets. When fully integrated with Ollama, I'll analyze rushing yard trends, defensive rankings, and workload distribution to give you precise recommendations.";
  }
  
  if (lowerMessage.includes('wr') || lowerMessage.includes('receiver')) {
    return "Wide receivers are showing interesting trends this season! With Ollama integration, I'll be able to analyze target share, red zone looks, and defensive vulnerabilities to identify the best WR plays.";
  }
  
  if (lowerMessage.includes('defense') || lowerMessage.includes('dst')) {
    return "Defensive matchups are crucial for fantasy success. Once connected to your database through Ollama, I'll provide detailed defensive rankings and opponent analysis.";
  }
  
  if (lowerMessage.includes('matchup') || lowerMessage.includes('vs')) {
    return "Matchup analysis is one of my strengths! When fully integrated, I'll compare historical performance, defensive weaknesses, and current form to predict game outcomes.";
  }
  
  if (lowerMessage.includes('trend') || lowerMessage.includes('hot') || lowerMessage.includes('cold')) {
    return "Player trends are fascinating to analyze! I'll soon be able to identify hot and cold streaks, usage pattern changes, and emerging breakout candidates using your comprehensive database.";
  }
  
  if (lowerMessage.includes('fantasy') || lowerMessage.includes('start') || lowerMessage.includes('sit')) {
    return "Fantasy advice is coming soon! With Ollama's natural language processing and your real-time NFL data, I'll provide personalized start/sit recommendations based on matchups, trends, and projections.";
  }

  return `Great question about "${message}"! I'm currently being set up with Ollama to provide intelligent analysis of your NFL database. Soon I'll be able to query player stats, analyze trends, provide matchup insights, and give you data-driven fantasy advice. The AI integration is almost ready!`;
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Chat API is running',
    status: 'Ready for Ollama integration'
  });
}