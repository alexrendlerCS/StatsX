import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { playerName } = await req.json();
    if (!playerName) return NextResponse.json({ error: 'playerName required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const candidates: Array<{ id: string; name: string; source: string }> = [];

    // Try player_list
    try {
      const { data } = await supabase.from('player_list').select('id,player_name').ilike('player_name', `%${playerName}%`).limit(10);
      if (Array.isArray(data)) {
        data.forEach((d: any) => candidates.push({ id: d.id ?? d.player_name, name: d.player_name, source: 'player_list' }));
      }
    } catch (e) {
      // ignore
    }

    // Try player_stats
    try {
      const { data } = await supabase.from('player_stats').select('player_id,player_name').ilike('player_name', `%${playerName}%`).limit(10);
      if (Array.isArray(data)) {
        data.forEach((d: any) => candidates.push({ id: d.player_id ?? d.player_name, name: d.player_name, source: 'player_stats' }));
      }
    } catch (e) {
      // ignore
    }

    // De-duplicate by id
    const map = new Map<string, any>();
    for (const c of candidates) map.set(String(c.id), c);
    const out = Array.from(map.values()).slice(0, 10);

    if (out.length === 0) return NextResponse.json({ error: 'No candidates found' }, { status: 404 });
    return NextResponse.json({ candidates: out });
  } catch (err: any) {
    console.error('resolve-player error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
