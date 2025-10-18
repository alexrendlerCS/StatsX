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
      // Heuristic: if the LLM didn't emit a tool call but the user's last message
      // looks like a request for a player summary (e.g., "Give me a summary of Breece Hall"),
      // automatically call the get_player_stats tool so we can provide an authoritative answer
      // instead of returning potentially hallucinated text.
      try {
        const lastUser = (messages && messages.length > 0) ? messages[messages.length - 1].content || '' : '';
        // look for explicit patterns like "summary of First Last" or "tell me about First Last"
        const namePatterns = [
          /summary of\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
          /give me a summary of\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
          /tell me about\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
          /how has\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
          /show me stats for\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
          /how will\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+do\s+this\s+week/i,
          /how do you expect\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+to/i,
          /will\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+play\s+this\s+week/i,
          /project(?:ed|ion)?s? for\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
          /upcoming matchup for\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        ];
        let m = null;
        for (const p of namePatterns) {
          const mm = String(lastUser).match(p);
          if (mm && mm[1]) {
            m = mm;
            break;
          }
        }
        if (m && m[1]) {
          const inferredName = m[1].trim();
          try {
            const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
            const url = new URL('/api/tools/resolve-player', base).toString();
            const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: inferredName }) });
            const j = await r.json();
            // If resolve-player returned multiple candidates, surface them for disambiguation
            if (j?.candidates && Array.isArray(j.candidates) && j.candidates.length > 1) {
              console.log('[ai-chat] resolve-player returned multiple candidates, returning to client');
              return NextResponse.json({ candidates: j.candidates.slice(0, 20), debug: { inferredName, resolve: j } });
            }
            // If exactly one candidate, call get_player_stats with the canonical id
            if (j?.candidates && Array.isArray(j.candidates) && j.candidates.length === 1) {
              const c = j.candidates[0];
              toolCall = { tool: 'get_player_stats', args: { playerId: c.id, playerName: c.name } };
              console.log('[ai-chat] inferred single candidate, toolCall:', toolCall);
            } else {
              // fallback: use the inferred name as a free-text playerName
              toolCall = { tool: 'get_player_stats', args: { playerName: inferredName } };
              console.log('[ai-chat] inferred toolCall for player summary (fallback):', toolCall);
            }
          } catch (e) {
            console.warn('[ai-chat] resolve-player failed, falling back to name:', inferredName, e);
            toolCall = { tool: 'get_player_stats', args: { playerName: inferredName } };
          }
        }
        // Fallback: if we still don't have a toolCall, try to find any First Last name
        // anywhere in the user's message and run resolve-player on it. This helps catch
        // phrasing variants that didn't match the explicit patterns above (e.g., "how will
        // breece hall do this week").
        if (!toolCall) {
          try {
            const anyNameRegex = /([A-Z][a-z]+\s+[A-Z][a-z]+)/g;
            const anyMatch = String(lastUser).match(anyNameRegex);
            if (anyMatch && anyMatch.length > 0) {
              // prefer the first occurrence
              const fallbackName = anyMatch[0].trim();
              const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
              const url = new URL('/api/tools/resolve-player', base).toString();
              const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: fallbackName }) });
              const j = await r.json();
              if (j?.candidates && Array.isArray(j.candidates) && j.candidates.length > 1) {
                return NextResponse.json({ candidates: j.candidates.slice(0, 20), debug: { inferredName: fallbackName, resolve: j } });
              }
              if (j?.candidates && Array.isArray(j.candidates) && j.candidates.length === 1) {
                const c = j.candidates[0];
                toolCall = { tool: 'get_player_stats', args: { playerId: c.id, playerName: c.name } };
                console.log('[ai-chat] fallback inferred single candidate, toolCall:', toolCall);
              } else {
                toolCall = { tool: 'get_player_stats', args: { playerName: fallbackName } };
                console.log('[ai-chat] fallback inferred toolCall for player summary (fallback):', toolCall);
              }
            }
          } catch (e) {
            // ignore fallback errors
          }
        }
      } catch (e) {
        // ignore and fall back to returning the draft
      }

      if (!toolCall) {
        return NextResponse.json({ message: { role: 'assistant', content: draft } });
      }
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
    // Build a server-side numeric summary from returned rows (authoritative)
    const toolData = (toolResult as any)?.data ?? {};
    const rows = Array.isArray(toolData.rows) ? toolData.rows : [];
    let serverSummary: any = null;
    if (rows.length > 0) {
      let games = rows.length;
      let totalRushingYards = 0;
      let totalPassingYards = 0;
      let totalReceivingYards = 0;
      let totalRushingTds = 0;
      let totalReceivingTds = 0;
      let totalPassingTds = 0;
      let totalReceptions = 0;
      let totalTargets = 0;
      for (const r of rows) {
        const get = (keys: string[]) => {
          for (const k of keys) {
            if (r[k] !== undefined && r[k] !== null) return Number(r[k]) || 0;
          }
          return 0;
        };
        totalRushingYards += get(['rushing_yards', 'rush_yds', 'rush_yards']);
        totalPassingYards += get(['passing_yards', 'pass_yds']);
        totalReceivingYards += get(['receiving_yards', 'rec_yds', 'receiving_yards']);
        totalRushingTds += get(['rushing_tds', 'rush_tds', 'rushing_tds']);
        totalReceivingTds += get(['receiving_tds', 'rec_tds', 'receiving_tds']);
        totalPassingTds += get(['passing_tds', 'pass_tds']);
        totalReceptions += get(['receptions', 'rec', 'recs']);
        totalTargets += get(['targets', 'target']);
      }
      serverSummary = {
        games,
        totalRushingYards,
        avgRushingYardsPerGame: +(totalRushingYards / games).toFixed(1),
        totalPassingYards,
        avgPassingYardsPerGame: +(totalPassingYards / games).toFixed(1),
        totalReceivingYards,
        avgReceivingYardsPerGame: +(totalReceivingYards / games).toFixed(1),
        totalRushingTds,
        totalReceivingTds,
        totalPassingTds,
        totalReceptions,
        totalTargets,
        rowCount: rows.length,
        source: (toolResult as any).meta?.source ?? null,
      };
        // If tool provided opponent defense ranks, include them in serverSummary
        try {
          const tdRanks = (toolResult as any).data?.opponentDefenseRank;
          if (tdRanks) serverSummary.opponentDefenseRank = tdRanks;
        } catch (e) {
          // ignore
        }
    } else {
      serverSummary = null;
    }

    // capture opponent/provenance fields for the follow-up
    const opponentIsBye = Boolean(toolData.opponentIsBye);
    const opponentId = toolData.opponentId ?? null;
    const opponentSource = toolData.opponentSource ?? null;
    const opponentDefenseSource = toolData.opponentDefenseSource ?? null;

    const summaryBlock = serverSummary
      ? `SERVER_SUMMARY_JSON: ${JSON.stringify(serverSummary)}`
      : 'NO_SERVER_SUMMARY_AVAILABLE';

    const followInput = [
      { role: 'system', content: SYSTEM },
      ...messages,
      { role: 'assistant', content: draft },
      { role: 'user', content: `You have access to authoritative database results in the block below. When answering, follow these rules strictly:\n1) Use the SERVER_SUMMARY numbers verbatim when present (do not alter or round them).\n2) Do NOT state any numeric statistic unless it appears in SERVER_SUMMARY or TOOL_DATA. If you must, say you don't know.\n3) If candidates or ambiguity exist, ask the user to disambiguate.\n4) Keep answers concise and cite which table/source the numbers came from (toolData.source or 'supabase').\n\nMatchup/opponent rules:\n5) If TOOL_DATA.opponentIsBye is true, explicitly state: "Player has a bye this week — no opponent; matchup context unavailable." Do NOT infer opponent defense numbers.\n6) If TOOL_DATA.opponentId is present, include opponent provenance using TOOL_DATA.opponentSource and TOOL_DATA.opponentDefenseSource when referencing defense allowances.\n\nRB-specific guard:\n7) If the player's position is 'RB' (running back), do NOT mention or invent passing statistics (completions, passing_attempts, passing_yards, passing_tds, interceptions) unless SERVER_SUMMARY.totalPassingYards > 0. If passing numbers are not present in SERVER_SUMMARY, explicitly say: "No passing stats available for this player in the authoritative data."\n\n${summaryBlock}\n\nTOOL_DATA: ${JSON.stringify((toolResult as any).data ?? {})}\n\nPlease produce a short, factual answer using only the authoritative data.` },
    ];

    let final: string;
    try {
      final = await queryOllama(JSON.stringify(followInput));
    } catch (e) {
      console.error('Ollama follow-up failed:', e);
      final = `Tool returned: ${JSON.stringify(toolResult)}`;
    }

  // Build response payload and include tool result/data so frontend can render structured output.
  // Server-side postprocessing enforcement: if opponent is a bye/missing or RB passing
  // stats are absent, produce a short authoritative summary that cannot be contradicted
  // by the model output. Keep the model's original answer in debug.originalAssistant.
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
          // Include provenance/opponent fields when available from toolData
          try {
            const td = (toolResult as any).data ?? {};
            if (td.provenance) payload.toolSummary.provenance = td.provenance;
            if (td.opponentId !== undefined) payload.toolSummary.opponentId = td.opponentId;
            if (td.opponentIsBye !== undefined) payload.toolSummary.opponentIsBye = td.opponentIsBye;
            if (td.opponentSource) payload.toolSummary.opponentSource = td.opponentSource;
              if (td.opponentDefenseSource) payload.toolSummary.opponentDefenseSource = td.opponentDefenseSource;
              if (td.opponentDefenseRank) payload.toolSummary.opponentDefenseRank = td.opponentDefenseRank;
              if (td.opponentRankSource) payload.toolSummary.opponentRankSource = td.opponentRankSource;
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore summary errors
      }
    }

    // --- Server-side enforcement / postprocessing ---
    try {
      const td = (toolResult as any).data ?? {};
      const rows = Array.isArray(td.rows) ? td.rows : [];
      const firstRow = rows[0] ?? {};
      const playerName = firstRow.player_name || firstRow.playerName || (validated && validated.args && validated.args.playerName) || 'Player';
      const positionId = firstRow.position_id || firstRow.position || (td.position) || null;
      const oppIsBye = Boolean(td.opponentIsBye);
      const oppId = td.opponentId ?? null;
      const oppDef = td.opponentDefense ?? null;
  const oppDefRank = td.opponentDefenseRank ?? null;

      const s = serverSummary ?? payload.toolSummary ?? {};
      const games = Number(s?.games ?? 0) || rows.length || 0;
      const totalRush = Number(s?.totalRushingYards ?? s?.totalRushingYards ?? 0) || 0;
      const avgRush = games > 0 ? +(totalRush / games).toFixed(1) : 0;
      const totalRec = Number(s?.totalReceivingYards ?? 0) || 0;
      const avgRec = games > 0 ? +(totalRec / games).toFixed(1) : 0;
      const totalPass = Number(s?.totalPassingYards ?? 0) || 0;

      // Decide if we need to override/clarify the assistant output
      let needOverride = false;
      let overrideReasons: string[] = [];
      if (oppIsBye || (!oppId && oppIsBye !== false)) {
        needOverride = true;
        overrideReasons.push('opponent_missing_or_bye');
      }
      // RB-specific: if RB and no passing yards, enforce explicit note
      const isRB = typeof positionId === 'string' && positionId.toUpperCase().startsWith('RB');
      const rbNoPass = isRB && totalPass === 0;
      if (rbNoPass) {
        needOverride = true;
        overrideReasons.push('rb_no_passing_stats');
      }

      // Inspect the model's final text for problematic content: unrecognized tool JSON
      const finalText = String(final || '');
      try {
        const trimmed = finalText.trim();
        // detect JSON tool object anywhere inside the text
        const jsonToolRegex = /\{[^}]*"tool"\s*:\s*"[^"]+"[^}]*\}/i;
        if (jsonToolRegex.test(finalText)) {
          // attempt to extract and parse the first JSON-looking object
          try {
            const m = finalText.match(jsonToolRegex);
            if (m && m[0]) {
              const parsed = JSON.parse(m[0]);
              if (parsed && parsed.tool && !(tools as any)[parsed.tool]) {
                needOverride = true;
                overrideReasons.push('unrecognized_tool_call_json');
              } else {
                // embedded tool JSON is not allowed even if tool exists (we only permit server-issued tool calls)
                needOverride = true;
                overrideReasons.push('embedded_tool_json_detected');
              }
            } else {
              needOverride = true;
              overrideReasons.push('embedded_tool_json_detected');
            }
          } catch (e) {
            needOverride = true;
            overrideReasons.push('embedded_tool_json_parse_error');
          }
        }
      } catch (e) {
        // ignore
      }

      // Look for embedded tool-ish fragments or name mentions that shouldn't be allowed
      const lowerFinal = finalText.toLowerCase();
      if (lowerFinal.includes('"tool"') || lowerFinal.includes('fantasy football predictor')) {
        needOverride = true;
        overrideReasons.push('embedded_tool_snippet');
      }

      // If the model mentions defensive rankings/DVOA/etc but we have no opponentDefense or ranking data,
      // enforce override when model asserts defense claims we cannot verify. If we have
      // authoritative opponent defense rank numbers, allow rank assertions that match.
  const defenseClaimPatterns = ['dvoa', 'rush defense', 'rushing defense', 'run defense', 'against the run', 'run', 'rank', 'ranking', 'ranked', 'points per game'];
      if (!oppDef && !oppDefRank && defenseClaimPatterns.some(p => lowerFinal.includes(p))) {
        needOverride = true;
        overrideReasons.push('defense_claim_without_data');
      }

      // If the model mentions a team name (e.g., Seahawks) but we have no opponent for the week, block it
      const teamNames = ['seahawks','rams','broncos','jaguars','steelers','cowboys','dolphins','bills','patriots','packers','niners','ravens','jets','browns','chiefs','eagles','vikings','bengals','colts','texans','panthers','cardinals','saints','buccaneers','chargers','giants','titans','bears','lions','falcons','washington','commanders'];
      if (!oppId && teamNames.some(t => lowerFinal.includes(t))) {
        needOverride = true;
        overrideReasons.push('mentioned_team_without_opponent');
      }

      // Detect unsupported start/sit recommendations when matchup/opponent data is missing
      const recommendPatterns = ['recommend starting', 'recommend to start', 'start him', 'start', 'sit him', 'start as your', 'i would start'];
      if ((!oppId || oppIsBye) && recommendPatterns.some(p => lowerFinal.includes(p))) {
        needOverride = true;
        overrideReasons.push('unsupported_recommendation_no_matchup');
      }

      // Detect unsupported specific game claims (e.g., "Week 7" or "career high") that reference past games
      // and check whether the claimed week appears in returned rows. If not, mark unsupported.
      try {
        const weekMatches = Array.from(finalText.matchAll(/week\s*(\d{1,2})/ig)).map(m => Number(m[1]));
        const rowWeeks = rows.map((r: any) => Number(r.week)).filter(Boolean);
        for (const wk of weekMatches) {
          if (!rowWeeks.includes(wk)) {
            needOverride = true;
            overrideReasons.push('unsupported_week_claim');
            break;
          }
        }
        if (/career[ -]?high/i.test(finalText)) {
          needOverride = true;
          overrideReasons.push('unsupported_career_claim');
        }
      } catch (e) {
        // ignore
      }

      if (needOverride) {
        // Sentence-level redaction: remove offending sentences and append authoritative notes.
        const finalText = String(final || '');
        // split into sentences (simple rule: split on punctuation followed by space)
        const sentences = finalText.split(/(?<=[.!?])\s+/);
        const kept: string[] = [];
        const removed: string[] = [];

        // helpers for detection
        const containsAny = (s: string, arr: string[]) => arr.some(p => s.includes(p));
        const lowerTeamNames = teamNames; // already lower-case array
  const defensePatterns = ['dvoa', 'rush defense', 'rushing defense', 'run defense', 'against the run', 'run', 'rank', 'ranking', 'ranked', 'points per game'];
        const recommendPatterns = ['recommend starting', 'recommend to start', 'start him', 'start', 'sit him', 'start as your', 'i would start'];
        const passRegex = /\b(pass(?:ing)?|completions|passing_attempts|passing_yards|passing_tds|interceptions)\b/i;
        const weekRegex = /week\s*(\d{1,2})/i;
        const jsonToolRegex = /\{[^}]*"tool"\s*:\s*"[^"]+"[^}]*\}/i;

        for (const s of sentences) {
          const sl = s.trim();
          const lower = sl.toLowerCase();
          let redact = false;

          // embedded tool JSON -> redact
          if (jsonToolRegex.test(sl) || lower.includes('fantasy football predictor')) {
            redact = true;
            removed.push(sl);
            continue;
          }

          // defense claims without data OR mismatched rank claims
          if (containsAny(lower, defensePatterns)) {
            if (!oppDef && !oppDefRank) {
              redact = true;
            } else if (oppDefRank) {
              // If the sentence contains a numeric rank, check it against authoritative ranks.
              // match numbers in forms like '5', '5th', or 'top-5'
              const rankMatch = sl.match(/(?:top[-\s])?(\d{1,3})(?:st|nd|rd|th)?/i);
              const num = rankMatch ? Number(rankMatch[1]) : null;
              const mentionsPass = /pass|passing|pass defense/i.test(sl);
              const mentionsRush = /rush|run|rushing|rush defense|against the run/i.test(sl);
              const mentionsReceive = /receiv|target|catch|receiving/i.test(sl);
              let matched = false;
              if (num !== null) {
                try {
                  if (mentionsPass && oppDefRank.pass_rank !== undefined && oppDefRank.pass_rank !== null) matched = Number(oppDefRank.pass_rank) === num;
                  if (mentionsRush && oppDefRank.rush_rank !== undefined && oppDefRank.rush_rank !== null) matched = matched || Number(oppDefRank.rush_rank) === num;
                  if (mentionsReceive && oppDefRank.receive_rank !== undefined && oppDefRank.receive_rank !== null) matched = matched || Number(oppDefRank.receive_rank) === num;
                  // If no specific mention, compare to composite_rank
                  if (!mentionsPass && !mentionsRush && !mentionsReceive && oppDefRank.composite_rank !== undefined && oppDefRank.composite_rank !== null) {
                    // allow rounding tolerance of 0.5
                    const comp = Number(oppDefRank.composite_rank);
                    if (!isNaN(comp)) matched = Math.abs(comp - num) <= 0.5;
                  }
                } catch (e) {
                  // parsing issues -> redact conservatively
                }
              }
              if (!matched) redact = true;
            }
          }

          // team mention without opponent
          if (!oppId && containsAny(lower, lowerTeamNames)) {
            redact = true;
          }

          // unsupported week/career claims
          if (weekRegex.test(sl)) {
            const match = weekRegex.exec(sl);
            if (match) {
              const wk = Number(match[1]);
              const rowWeeks = rows.map((r: any) => Number(r.week)).filter(Boolean);
              if (!rowWeeks.includes(wk)) redact = true;
            }
          }
          if (/career[ -]?high/i.test(sl)) redact = true;

          // recommendations without matchup
          if ((!oppId || oppIsBye) && containsAny(lower, recommendPatterns)) redact = true;

          // RB passing-stat sentences
          if (isRB && totalPass === 0 && passRegex.test(sl)) {
            redact = true;
          }

          if (redact) {
            removed.push(sl);
          } else {
            kept.push(sl);
          }
        }

        // Build authoritative appended notes
        const appended: string[] = [];
        if (isRB && totalPass === 0) appended.push('No passing stats available for this player in the authoritative data.');
        if (oppIsBye) appended.push('Player has a bye this week — no opponent; matchup context unavailable.');
        if (!oppIsBye && !oppId) appended.push('No opponent found for the configured week; matchup data unavailable.');
        if (!oppDef && (overrideReasons.includes('defense_claim_without_data') || removed.some(r => defensePatterns.some(p => r.toLowerCase().includes(p))))) appended.push('No opponent defense data available in authoritative sources.');
        if (removed.some(r => jsonToolRegex.test(r) || r.toLowerCase().includes('fantasy football predictor'))) appended.push('Embedded tool calls or JSON were suppressed.');

        // If everything was removed, fallback to concise authoritative summary
        let newContent = kept.join(' ').trim();
        if (!newContent) {
          const parts: string[] = [];
          parts.push(`${playerName} — authoritative summary:`);
          if (games > 0) {
            parts.push(`Games: ${games}. Rushing: ${totalRush} yards (avg ${avgRush} ypg). Receiving: ${totalRec} yards (avg ${avgRec} ypg).`);
          } else {
            parts.push('No recent game rows available in the authoritative data.');
          }
          if (totalPass > 0) {
            const avgPass = +(totalPass / Math.max(1, games)).toFixed(1);
            parts.push(`Passing: ${totalPass} yards (avg ${avgPass} ypg).`);
          } else if (isRB) {
            parts.push('No passing stats available for this player in the authoritative data.');
          }
          if (oppIsBye) parts.push('Player has a bye this week — no opponent; matchup context unavailable.');
          newContent = parts.join(' ');
        } else if (appended.length) {
          newContent = `${newContent} ${appended.join(' ')}`.trim();
        }

        // Populate debug info and replace assistant content minimally
        payload.debug = payload.debug || {};
        payload.debug.originalAssistant = final;
        payload.debug.redacted = { removed, appended, overrideReasons };
        if (overrideReasons && overrideReasons.length) payload.debug.overrideReasons = overrideReasons;
        payload.message.content = newContent;

        // Recommendation allowance: disallow start/sit recommendations when opponent missing/bye or RB missing passing data
        const recAllowed = !(oppIsBye || (!oppId && oppIsBye !== false) || rbNoPass || overrideReasons.includes('unsupported_recommendation_no_matchup'));
        payload.recommendation = { allowed: recAllowed, reason: recAllowed ? null : overrideReasons.join(',') };
      }
    } catch (e) {
      // If anything goes wrong in postprocessing, keep original assistant output
      console.warn('postprocessing enforcement failed:', e);
    }

    // Ensure the user always receives a concise, server-generated authoritative
    // summary block with key numbers (games, rushing yards, receptions, opponent,
    // and opponent defense ranks). This is appended to the assistant content so
    // the UI can surface safe DB facts even when model prose is partially
    // redacted.
    try {
      const sm = payload.toolSummary || serverSummary || (payload.toolData && payload.toolData.toolSummary) || null;
      const td = payload.toolData ?? toolData ?? (toolResult && (toolResult as any).data) ?? null;
      if (sm) {
        const parts: string[] = [];
        if (sm.games !== undefined) parts.push(`Games: ${sm.games}`);
        if (sm.totalRushingYards !== undefined) parts.push(`Rushing: ${sm.totalRushingYards} yards (avg ${sm.avgRushingYardsPerGame ?? sm.avgRushingYardsPerGame ?? 'N/A'} ypg)`);
        if (sm.totalReceptions !== undefined) parts.push(`Receptions: ${sm.totalReceptions}`);
        const opp = (sm.opponentId ?? td?.opponentId) || null;
        if (opp) parts.push(`Opponent: ${opp}`);
        const dr = (sm.opponentDefenseRank ?? td?.opponentDefenseRank) || null;
        if (dr) {
          const drParts: string[] = [];
          if (dr.rush_rank !== undefined && dr.rush_rank !== null) drParts.push(`rush_rank=${dr.rush_rank}`);
          if (dr.pass_rank !== undefined && dr.pass_rank !== null) drParts.push(`pass_rank=${dr.pass_rank}`);
          if (dr.receive_rank !== undefined && dr.receive_rank !== null) drParts.push(`receive_rank=${dr.receive_rank}`);
          if (dr.composite_rank !== undefined && dr.composite_rank !== null) drParts.push(`composite=${dr.composite_rank}`);
          if (drParts.length) parts.push(`Opponent defense ranks: ${drParts.join(', ')}`);
        }
        const prov = sm.provenance || sm.source || (payload.toolSummary && payload.toolSummary.provenance) || null;
        const provText = prov ? ` Source provenance: ${JSON.stringify(prov)}.` : '';
        const summaryText = `\n\nAuthoritative summary (from DB): ${parts.join('. ')}.${provText}`;
        if (!String(payload.message.content || '').includes('Authoritative summary (from DB):')) {
          payload.message.content = `${payload.message.content || ''}${summaryText}`;
        }
      }
    } catch (e) {
      // don't let this block the response
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