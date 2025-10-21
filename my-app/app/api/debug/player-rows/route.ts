import { NextRequest, NextResponse } from 'next/server';

// This route inspects request properties and should be handled dynamically.
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { playerId, playerName } = await req.json();
    if (!playerId && !playerName) {
      return NextResponse.json({ error: 'playerId or playerName is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const statsTables = ['player_game_stats', 'player_stats', 'nfl_historical_stats', 'recent_player_stats', 'player_season_stats'];

    const results: Record<string, any> = {};

    for (const t of statsTables) {
      // fetch columns for table
      let cols: string[] = [];
      try {
        const { data: colData, error: colErr } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', t);
        if (colErr) {
          results[t] = { error: colErr };
          continue;
        }
        cols = (colData || []).map((c: any) => c.column_name as string);
      } catch (err: any) {
        results[t] = { error: err?.message || String(err) };
        continue;
      }

      const hasPlayerId = cols.includes('player_id');
      const hasPlayerName = cols.includes('player_name');
      const hasSeason = cols.includes('season');
      const hasWeek = cols.includes('week');

      // Try count by player_id if available
      try {
        let count = 0;
        let sample: any[] = [];
        if (playerId && hasPlayerId) {
          const { data, error, count: c } = await supabase.from(t).select('*', { count: 'exact' }).eq('player_id', String(playerId)).limit(5);
          if (error) {
            results[t] = { columns: cols, error };
            continue;
          }
          count = c ?? (Array.isArray(data) ? data.length : 0);
          sample = data ?? [];
        } else if (playerName && hasPlayerName) {
          const { data, error, count: c } = await supabase.from(t).select('*', { count: 'exact' }).ilike('player_name', `%${playerName}%`).limit(5);
          if (error) {
            results[t] = { columns: cols, error };
            continue;
          }
          count = c ?? (Array.isArray(data) ? data.length : 0);
          sample = data ?? [];
        }

        results[t] = { columns: cols, hasPlayerId, hasPlayerName, hasSeason, hasWeek, count, sample };
      } catch (err: any) {
        results[t] = { columns: cols, error: err?.message || String(err) };
      }
    }

    return NextResponse.json({ ok: true, inspected: results });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
