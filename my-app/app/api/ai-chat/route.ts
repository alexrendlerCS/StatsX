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

    // If the tool returned candidate results (e.g., name resolution), forward them
    // directly to the client so the UI can present a disambiguation flow.
    try {
      const maybeData = (toolResult as any)?.data;
      if (maybeData && maybeData.candidates && Array.isArray(maybeData.candidates) && maybeData.candidates.length > 0) {
        return NextResponse.json({ candidates: maybeData.candidates, debug: { toolCall, toolResult } });
      }
    } catch (e) {
      // ignore and continue to follow-up behavior
    }

    // If get_player_stats returned not found / empty, attempt to call resolve-player to get candidates
    try {
      const notFound = (toolResult as any)?.error?.message === 'Player not found' || (toolResult as any)?.data?.error === 'Player not found';
      if (notFound && toolCall.tool === 'get_player_stats') {
        // call resolve-player endpoint
        try {
          const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
          const url = new URL('/api/tools/resolve-player', base).toString();
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: toolCall.args?.playerName }) });
          const j = await r.json();
          if (j?.candidates && Array.isArray(j.candidates) && j.candidates.length > 0) {
            return NextResponse.json({ candidates: j.candidates, debug: { toolCall, toolResult, resolve: j } });
          }
        } catch (e) {
          // ignore and continue
        }
      }
    } catch (e) {
      // ignore
    }

    // Follow-up: feed tool result back for final answer.
    // Provide a strict instruction block that tells the LLM to rely on server-side
    // numeric summaries (toolSummary) verbatim and NOT to invent, extrapolate, or
    // reuse historical memory. This helps prevent the model from asserting wrong
    // counts (e.g., "7 TDs") when the DB shows different numbers.
    const serverSummary = (toolResult as any)?.data ? ((toolResult as any).data) : null;
    const summaryBlock = (toolResult as any)?.toolSummary
      ? `SERVER_SUMMARY: ${JSON.stringify((toolResult as any).toolSummary)}`
      : serverSummary
      ? `TOOL_DATA_KEYS: ${Object.keys(serverSummary).join(', ')}. Use the data block below if needed.`
      : 'NO_TOOL_SUMMARY_AVAILABLE';

    const followInput = [
      { role: 'system', content: SYSTEM },
      ...messages,
      { role: 'assistant', content: draft },
      { role: 'user', content: `You have access to authoritative database results in the block below. When answering, follow these rules strictly:\n1) Use the SERVER_SUMMARY numbers verbatim when present (do not alter or round them).\n2) Do NOT state any numeric statistic unless it appears in SERVER_SUMMARY or TOOL_DATA. If you must, say you don't know.\n3) If candidates or ambiguity exist, ask the user to disambiguate.\n4) Keep answers concise and cite which table/source the numbers came from (toolData.source or 'supabase').\n\n${summaryBlock}\n\nTOOL_DATA: ${JSON.stringify((toolResult as any).data ?? {})}\n\nPlease produce a short, factual answer using only the authoritative data.` },
    ];

    let final: string;
    try {
      final = await queryOllama(JSON.stringify(followInput));
    } catch (e) {
      console.error('Ollama follow-up failed:', e);
      final = `Tool returned: ${JSON.stringify(toolResult)}`;
    }

    // Build response payload and include tool result/data so frontend can render structured output.
    const payload: any = { message: { role: 'assistant', content: final } };
    if (toolResult) {
      payload.toolResult = toolResult;
      if ((toolResult as any).data !== undefined) payload.toolData = (toolResult as any).data;

      // If tool returned rows, compute a small authoritative summary (server-side) so the UI/LLM
      // can rely on DB aggregates instead of model memory.
      try {
        const rows = (toolResult as any).data?.rows;
        if (Array.isArray(rows) && rows.length > 0) {
          const games = rows.length;
          let totalRush = 0;
          let totalRushTds = 0;
          let totalRec = 0;
          let totalRecTds = 0;
          for (const r of rows) {
            const ry = Number(r.rushing_yards ?? r.rush_yds ?? r.rushing_yards ?? 0) || 0;
            const rtd = Number(r.rushing_tds ?? r.rushing_tds ?? r.td ?? 0) || 0;
            const rec = Number(r.receptions ?? r.receptions ?? 0) || 0;
            const rectd = Number(r.receiving_tds ?? r.receiving_tds ?? 0) || 0;
            totalRush += ry;
            totalRushTds += rtd;
            totalRec += rec;
            totalRecTds += rectd;
          }
          const avgRushPerGame = games > 0 ? +(totalRush / games).toFixed(1) : 0;
          payload.toolSummary = {
            games,
            totalRushingYards: totalRush,
            totalRushingTds: totalRushTds,
            avgRushingYardsPerGame: avgRushPerGame,
            totalReceptions: totalRec,
            totalReceivingTds: totalRecTds,
            source: (toolResult as any).meta?.source ?? null,
            rowCount: rows.length,
          };
        }
      } catch (e) {
        // ignore summary errors
      }
    }

    // If this was a dev simulation, include debug info so tests can inspect tool results
    if (simulateDraft !== undefined) {
      return NextResponse.json({ ...payload, debug: { toolCall, toolResult } });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}