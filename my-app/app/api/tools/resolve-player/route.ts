import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
  const { playerName: rawName } = await req.json();
  if (!rawName) return NextResponse.json({ error: 'playerName required' }, { status: 400 });

  // Normalize incoming name: remove periods, collapse whitespace, trim
  const playerName = String(rawName).replace(/\./g, '').replace(/\s+/g, ' ').trim();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

  const candidates: Array<{ id: string; name: string; source: string; team?: string; position?: string }> = [];

    // Try player_list (prefer this canonical source when available)
    try {
      const { data } = await supabase.from('player_list').select('id,player_name,team_id,position').ilike('player_name', `%${playerName}%`).limit(10);
      if (Array.isArray(data)) {
        data.forEach((d: any) => candidates.push({ id: d.id ?? d.player_name, name: d.player_name, source: 'player_list', team: d.team_id ?? d.team, position: d.position }));
      }
    } catch (e) {
      // ignore
    }

    // Try player_stats
    try {
      const { data } = await supabase.from('player_stats').select('player_id,player_name,team').ilike('player_name', `%${playerName}%`).limit(10);
      if (Array.isArray(data)) {
        data.forEach((d: any) => candidates.push({ id: d.player_id ?? d.player_name, name: d.player_name, source: 'player_stats', team: d.team }));
      }
    } catch (e) {
      // ignore
    }

    // Canonicalize candidates:
    // - normalize by player name (lowercased) and merge duplicates
    // - prefer numeric IDs when available (these are canonical player ids)
    // - if both non-numeric, prefer entries from `player_list` over `player_stats`
    // - provide `preferred` flag and include team/position metadata when present
    const byName = new Map<string, any>();
    for (const c of candidates) {
      const nameKey = (c.name || String(c.id || '')).toLowerCase().trim();
      const existing = byName.get(nameKey);
      if (!existing) {
        byName.set(nameKey, { ...c });
        continue;
      }

      const existingIsNumeric = !isNaN(Number(existing.id));
      const cIsNumeric = !isNaN(Number(c.id));

      // Prefer numeric id when available
      if (!existingIsNumeric && cIsNumeric) {
        byName.set(nameKey, { ...c });
        continue;
      }
      if (existingIsNumeric && !cIsNumeric) {
        // keep existing
        continue;
      }

      // If both numeric or both non-numeric, prefer player_list source
      if (existing.source === 'player_stats' && c.source === 'player_list') {
        byName.set(nameKey, { ...c });
        continue;
      }

      // Otherwise merge metadata (prefer existing fields, but fill missing team/position)
      existing.team = existing.team || c.team;
      existing.position = existing.position || c.position;
      byName.set(nameKey, existing);
    }

    // Also dedupe by id in case different name-normalizations map to the same id
    const idMap = new Map<string, any>();
    for (const v of byName.values()) {
      const key = String(v.id);
      const existing = idMap.get(key);
      if (!existing) {
        idMap.set(key, v);
        continue;
      }
      // Merge metadata if duplicate ids found
      existing.team = existing.team || v.team;
      existing.position = existing.position || v.position;
      // prefer source 'player_list' for preferred
      if (existing.source !== 'player_list' && v.source === 'player_list') {
        idMap.set(key, v);
      }
    }

    // Build final output and add `preferred` flag: true when id is numeric and source is player_list
    const out = Array.from(idMap.values()).slice(0, 10).map((c: any) => ({
      id: c.id,
      name: c.name,
      source: c.source,
      team: c.team || null,
      position: c.position || null,
      preferred: !isNaN(Number(c.id)) && c.source === 'player_list'
    }));

    if (out.length === 0) return NextResponse.json({ error: 'No candidates found' }, { status: 404 });
    return NextResponse.json({ candidates: out });
  } catch (err: any) {
    console.error('resolve-player error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
