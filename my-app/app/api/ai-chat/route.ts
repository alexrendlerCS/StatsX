import { NextRequest, NextResponse } from 'next/server';
import { queryOllama, checkOllamaHealth, getAvailableModels } from '@/lib/ollama';
import { tools } from '@/lib/toolsRegistry';

const SYSTEM = `You are StatsX Analyst. If you need data, emit a SINGLE-LINE JSON object: {"tool":"<tool>","args":{...}}`;

function generatePlaceholderResponse(message: string): string {
  const lowerMessage = (message || '').toLowerCase();
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
  try {
    const isOllamaUp = await checkOllamaHealth();
    const models = isOllamaUp ? await getAvailableModels() : [];
    return NextResponse.json({ ok: true, model: models[0] ?? null, available: isOllamaUp });
  } catch (err) {
    return NextResponse.json({ ok: true, model: null, available: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Allow an optional dev-only `simulateDraft` in the POST body to bypass Ollama and
    // simulate an assistant response (useful for server-side testing).
    const body = await request.json(); // { messages: [{role,content}], simulateDraft?: string }
    const messages = body?.messages;
    const simulateDraft = body?.simulateDraft;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const llmInput = [{ role: 'system', content: SYSTEM }, ...messages];

    // Ask Ollama (first pass) OR use the simulateDraft when provided
    let draft: string;
    if (simulateDraft !== undefined) {
      draft = typeof simulateDraft === 'string' ? simulateDraft : JSON.stringify(simulateDraft);
      console.log('[ai-chat] using simulateDraft for testing:', draft);
    } else {
      try {
        draft = await queryOllama(JSON.stringify(llmInput));
      } catch (e) {
        console.error('Ollama query failed:', e);
        return NextResponse.json({ message: { role: 'assistant', content: generatePlaceholderResponse((messages[messages.length-1] || {}).content || '') } });
      }
    }

    // Try parse tool-call JSON
    let toolCall: { tool: string; args: any } | null = null;
    try {
      const trimmed = draft.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const obj = JSON.parse(trimmed);
        if (obj?.tool && obj?.args) toolCall = obj;
      }
    } catch (e) {
      toolCall = null;
    }

    if (!toolCall) {
      return NextResponse.json({ message: { role: 'assistant', content: draft } });
    }

    // Validate tool
    const spec = (tools as any)[toolCall.tool];
    if (!spec) {
      return NextResponse.json({ message: { role: 'assistant', content: `Tool not found: ${toolCall.tool}` } });
    }
    const validated = spec.validateArgs(toolCall.args);
    if (!validated.ok) {
      return NextResponse.json({ message: { role: 'assistant', content: `Tool validation failed: ${validated.error}` } });
    }

    // Call tool
    const toolResult = await spec.call(validated.args);

    // Follow-up: feed tool result back for final answer
    const followInput = [
      { role: 'system', content: SYSTEM },
      ...messages,
      { role: 'assistant', content: draft },
      { role: 'user', content: `TOOL RESULT: ${JSON.stringify(toolResult)}. Please answer concisely.` },
    ];

    let final: string;
    try {
      final = await queryOllama(JSON.stringify(followInput));
    } catch (e) {
      console.error('Ollama follow-up failed:', e);
      final = `Tool returned: ${JSON.stringify(toolResult)}`;
    }

    // If this was a dev simulation, include debug info so tests can inspect tool results
    if (simulateDraft !== undefined) {
      return NextResponse.json({ message: { role: 'assistant', content: final }, debug: { toolCall, toolResult } });
    }

    return NextResponse.json({ message: { role: 'assistant', content: final } });
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}