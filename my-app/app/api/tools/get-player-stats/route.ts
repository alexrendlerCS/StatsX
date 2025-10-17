import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { playerName, season, weeks } = await req.json();

    if (!playerName) {
      return NextResponse.json({ error: 'playerName is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Dev mock mode: return sample data if enabled to allow testing without DB
    const useMock = !!process.env.DEV_USE_MOCK_DB;
    if (useMock) {
      const sampleRows = [
        { week: 10, season: 2025, team: 'TEN', opponent: 'GB', rush_att: 22, rush_yds: 115, targets: 1, receptions: 1, rec_yds: 6, td: 1, snap_percent: 0.78, redzone_touches: 3 },
        { week: 9, season: 2025, team: 'TEN', opponent: 'DAL', rush_att: 18, rush_yds: 87, targets: 0, receptions: 0, rec_yds: 0, td: 0, snap_percent: 0.72, redzone_touches: 2 },
      ];
      return NextResponse.json({ playerId: 'mock-derrick-henry', rows: sampleRows });
    }

    // Resolve player_id from players table (fallbacks may be required depending on your schema)
    // Try exact-ish lookup (case-insensitive)
    let { data: playerRow, error: pErr } = await supabase
      .from('players')
      .select('id,name')
      .ilike('name', playerName)
      .maybeSingle();

    // If no single match, try fallback heuristics (substring match, first/last heuristics)
    if (pErr || !playerRow) {
      const nameLike = `%${playerName}%`;
      const { data: candidates, error: cErr } = await supabase
        .from('players')
        .select('id,name')
        .ilike('name', nameLike)
        .limit(10);

      if (cErr) {
        console.error('players lookup error:', cErr);
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      if (candidates && candidates.length === 1) {
        playerRow = candidates[0] as any;
      } else {
        // Try splitting into first/last and searching by last name and first initial
        const parts = (playerName || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          const first = parts[0];
          const last = parts[parts.length - 1];
          const { data: candidates2, error: c2Err } = await supabase
            .from('players')
            .select('id,name')
            .ilike('name', `%${last}%`)
            .ilike('name', `%${first}%`)
            .limit(10);

          if (c2Err) console.warn('players first/last lookup error:', c2Err);

          const merged = [] as any[];
          if (Array.isArray(candidates)) merged.push(...candidates);
          if (Array.isArray(candidates2)) merged.push(...candidates2);
          // dedupe by id
          const uniq = merged.reduce((acc: any, cur: any) => {
            acc[cur.id] = cur;
            return acc;
          }, {} as Record<string, any>);
          const uniqueCandidates = Object.values(uniq);

          if (uniqueCandidates.length === 1) {
            playerRow = uniqueCandidates[0] as any;
          } else {
            // Return candidates so the caller can disambiguate
            return NextResponse.json({ error: 'Player not found', candidates: uniqueCandidates }, { status: 404 });
          }
        } else {
          return NextResponse.json({ error: 'Player not found', candidates: candidates ?? [] }, { status: 404 });
        }
      }
    }

    let q: any = supabase
      .from('player_game_stats')
      .select('week, season, team, opponent, rush_att, rush_yds, targets, receptions, rec_yds, td, snap_percent, redzone_touches')
      .eq('player_id', playerRow.id)
      .order('season', { ascending: false })
      .order('week', { ascending: false })
      .limit(200);

    if (season) q = q.eq('season', season);
    if (weeks?.length) q = q.in('week', weeks);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ playerId: playerRow.id, rows: data ?? [] });
  } catch (err: any) {
    console.error('get-player-stats error:', err?.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
