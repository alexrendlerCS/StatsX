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

    // Resolve player_id from players table (fallbacks may be required depending on your schema)
    const { data: playerRow, error: pErr } = await supabase
      .from('players')
      .select('id')
      .ilike('name', playerName)
      .maybeSingle();

    if (pErr || !playerRow) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
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
