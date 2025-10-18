import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
  const { playerName, playerId: providedPlayerId, season, weeks, limit = 200, offset = 0 } = await req.json();

    if (!playerName) {
      return NextResponse.json({ error: 'playerName is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Dev mock mode: return sample data if enabled to allow testing without DB
    // Accept explicit truthy values only ("1", "true", "yes", "on").
    const parseEnvBool = (v?: string) => {
      if (!v) return false;
      const s = v.toString().trim().toLowerCase();
      return ['1', 'true', 'yes', 'on'].includes(s);
    };

    const useMock = parseEnvBool(process.env.DEV_USE_MOCK_DB);
    if (useMock) {
      const sampleRows = [
        { week: 10, season: 2025, team: 'TEN', opponent: 'GB', rush_att: 22, rush_yds: 115, targets: 1, receptions: 1, rec_yds: 6, td: 1, snap_percent: 0.78, redzone_touches: 3 },
        { week: 9, season: 2025, team: 'TEN', opponent: 'DAL', rush_att: 18, rush_yds: 87, targets: 0, receptions: 0, rec_yds: 0, td: 0, snap_percent: 0.72, redzone_touches: 2 },
      ];
      return NextResponse.json({ playerId: 'mock-derrick-henry', rows: sampleRows });
    }

    // If caller provided `playerId`, prefer it and skip name resolution.
    if (providedPlayerId) {
      // we'll set playerRow below; create a temporary holder name that won't conflict
      // with the main resolver's variable name
      var __provided_player_row = { id: providedPlayerId, name: playerName ?? providedPlayerId } as any;
    }

    // Resolve player_id/name from several possible tables.
    // Some deployments don't have a `players` table; try fallbacks in order.
    async function tryTable(table: string, idCol: string, nameCol: string, single = true) {
      try {
        if (single) {
          const { data, error } = await supabase.from(table).select(`${idCol},${nameCol}`).ilike(nameCol, playerName).maybeSingle();
          return { data, error };
        } else {
          const { data, error } = await supabase.from(table).select(`${idCol},${nameCol}`).ilike(nameCol, `%${playerName}%`).limit(10);
          return { data, error };
        }
      } catch (err: any) {
        // Supabase client may not throw; but if it does, log and return an error-like object
        return { data: null, error: err };
      }
    }

    const candidateTables = [
      { table: 'players', idCol: 'id', nameCol: 'name', single: true },
      { table: 'player_list', idCol: 'id', nameCol: 'player_name', single: false },
      { table: 'player_stats', idCol: 'player_id', nameCol: 'player_name', single: false },
      { table: 'nfl_historical_stats', idCol: 'player_id', nameCol: 'player_name', single: false },
    ];

  // If a provided player row exists, prefer it
  let playerRow: any = (typeof __provided_player_row !== 'undefined') ? __provided_player_row : null;
  let lastCandidates: any[] | null = null;
    for (const ct of candidateTables) {
      const res = await tryTable(ct.table, ct.idCol, ct.nameCol, ct.single);
      if (res.error) {
        // If table is missing from schema cache, try next table silently.
        // Log non-schema errors for visibility.
        const code = (res.error as any)?.code;
        if (code === 'PGRST205') {
          console.debug(`table ${ct.table} missing in schema cache, skipping`);
          continue;
        }
        console.warn(`lookup error on ${ct.table}:`, res.error);
        continue;
      }

      if (!res.data) continue;

      if (Array.isArray(res.data)) {
        if (res.data.length === 0) continue;
        if (res.data.length === 1) {
          const item = res.data[0] as any;
          playerRow = { id: item[ct.idCol] ?? item.player_id ?? item.id, name: item[ct.nameCol] };
          break;
        }
        // multiple candidates found
        lastCandidates = (res.data as any[]).map((r: any) => ({ id: r[ct.idCol] ?? r.player_id ?? r.id, name: r[ct.nameCol] }));
        // continue to next table to try to narrow; but if no other table exists, we'll handle candidates below
        continue;
      }

      // maybeSingle returned an object
      const d = res.data as any;
      if (d && (d[ct.idCol] || d[ct.nameCol])) {
        playerRow = { id: d[ct.idCol] ?? d.player_id ?? d.id, name: d[ct.nameCol] };
        break;
      }
    }

    if (!playerRow) {
      if (lastCandidates && lastCandidates.length > 0) {
        // If we have ambiguous candidates, return them for caller disambiguation
        return NextResponse.json({ error: 'Player not found', candidates: lastCandidates }, { status: 404 });
      }
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

  // Fetch game rows from the canonical tables. For the current season prefer
  // `player_stats` (ordered by week), and for previous seasons prefer
  // `nfl_historical_stats` (ordered by season then week). Remove legacy
  // `player_game_stats` table usage since it's not present in the catalog.
  const statsTables = ['player_stats', 'nfl_historical_stats', 'recent_player_stats', 'player_season_stats'];

  async function tryFetchFromTable(table: string) {
      // Trial-query approach: attempt queries with progressively relaxed filters.
      // This avoids querying information_schema (which is blocked in some PostgREST setups)
      // and instead reacts to column-not-found / missing-table errors at runtime.
      try {
        const pid = playerRow?.id;

        async function exec(q: any) {
          try {
            // apply offset/limit when the query supports it (PostgREST supports limit/offset)
            const r = await q.range(offset, Math.max(0, offset + (limit || 200) - 1));
            return { data: r.data, error: r.error };
          } catch (err: any) {
            return { data: null, error: err };
          }
        }

  // Build a list of query attempts in order of strict -> relaxed.
  const attempts: Array<() => Promise<any>> = [];
  // Table capability hints (based on db_catalog.yaml)
  const tablesWithSeason = new Set(['nfl_historical_stats', 'player_season_stats']);
  const tablesWithWeek = new Set(['player_stats', 'recent_player_stats', 'nfl_historical_stats']);

        // helper to attach ordering based on table semantics
        function orderFor(tbl: string, q: any) {
          try {
            if (tbl === 'player_stats' || tbl === 'recent_player_stats') {
              return q.order('week', { ascending: false });
            }
            if (tbl === 'nfl_historical_stats') {
              return q.order('season', { ascending: false }).order('week', { ascending: false });
            }
            // default
            return q;
          } catch (e) {
            return q;
          }
        }

        // If we have a player id, prefer queries by player_id first.
        if (pid) {
          // Strict: player_id + season + weeks if provided and table supports season/week
          if (tablesWithSeason.has(table) && season && tablesWithWeek.has(table) && weeks && Array.isArray(weeks) && weeks.length) {
            attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').eq('player_id', pid).eq('season', season).in('week', weeks).limit(200))));
          }
          // player_id + season (only for tables that support season)
          if (tablesWithSeason.has(table) && season) {
            attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').eq('player_id', pid).eq('season', season).limit(200))));
          }
          // player_id + week filtering (if weeks provided and table supports week)
          if (tablesWithWeek.has(table) && weeks && Array.isArray(weeks) && weeks.length) {
            attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').eq('player_id', pid).in('week', weeks).limit(200))));
          }
          // player_id + limit & ordering (no season/week)
          attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').eq('player_id', pid).limit(200))));
        }

        // Next, try by player_name (if name available)
        if (playerRow?.name) {
          attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').ilike('player_name', `%${playerRow.name}%`).limit(200))));
          if (tablesWithSeason.has(table) && season) attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').ilike('player_name', `%${playerRow.name}%`).eq('season', season).limit(200))));
          if (tablesWithWeek.has(table) && weeks && Array.isArray(weeks) && weeks.length) attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').ilike('player_name', `%${playerRow.name}%`).in('week', weeks).limit(200))));
        }

        // Final more permissive attempt: select * (may return many rows but bounded by limit)
        attempts.push(() => exec(orderFor(table, supabase.from(table).select('*').limit(200))));

        // Execute attempts in sequence, handling recoverable errors by moving to the next attempt.
        for (const at of attempts) {
          const res = await at();
          if (res == null) continue;
          // If the error indicates the whole table is missing from the schema cache, bubble up so caller can skip table.
          const errCode = res.error?.code || res.error?.message || null;
          if (res.error) {
            // PostgREST schema cache missing table error (PGRST205) shows up here.
            if (String(errCode).includes('PGRST205')) {
              return res; // caller will skip table
            }
            // Column-not-found errors or other SQL errors: log and continue to next attempt.
            console.debug(`query attempt on ${table} failed, continuing to next attempt:`, res.error?.message || res.error);
            continue;
          }

          if (Array.isArray(res.data) && res.data.length > 0) return res;
          if (res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
            // maybeSingle returned an object
            return { data: [res.data], error: null };
          }

          // empty result -> try next attempt
          continue;
        }

        // If we reached here, no attempts returned rows but table exists; return empty result
        return { data: null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }

    let rows: any[] | null = null;
    for (const t of statsTables) {
      const fetched = await tryFetchFromTable(t);
      if (fetched && (fetched as any).error) {
        const code = (fetched as any).error?.code;
        if (code === 'PGRST205') {
          console.debug(`table ${t} missing in schema cache, skipping`);
          continue;
        }
        console.warn(`error fetching from ${t}:`, (fetched as any).error);
        continue;
      }

      if (fetched && Array.isArray((fetched as any).data) && (fetched as any).data.length > 0) {
        rows = (fetched as any).data;
        break;
      }
    }

    if (!rows) {
      return NextResponse.json({ error: 'No game rows found for player' }, { status: 404 });
    }

    // Return rows as-is; callers can adapt to available fields.
    return NextResponse.json({ playerId: playerRow.id, rows });
  } catch (err: any) {
    console.error('get-player-stats error:', err?.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
