import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
    let sourceTable: string | null = null;
    let returnedSeason: number | null = null;
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
        sourceTable = t;
        // attempt to infer season from first row if present
        const first = rows[0] as any;
        if (first && typeof first.season === 'number') returnedSeason = first.season;
        break;
      }
    }

    if (!rows) {
      return NextResponse.json({ error: 'No game rows found for player' }, { status: 404 });
    }

    // Determine player's team for matchup lookup. Prefer team_id from rows if present.
    let playerTeamId: string | null = null;
    try {
      if (rows && rows.length > 0 && rows[0].team_id) playerTeamId = rows[0].team_id;
      else {
        // fallback: try to read from player_list or player_stats by id
        try {
          const pl = await supabase.from('player_stats').select('team_id').eq('player_id', playerRow.id).limit(1).maybeSingle();
          if (pl?.data && pl.data.team_id) playerTeamId = pl.data.team_id;
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

  let opponentId: string | null = null;
  let opponentDefense: any = null;
  let opponentDefenseRank: any = null;
  let opponentSource: string | null = null;
  let opponentIsBye = false;
  let opponentDefenseSource: string | null = null;
  let opponentRankSource: string | null = null;
  let teamMismatchWarning: string | null = null;
  const provenance: any = {};
    try {
      const cw = Number(process.env.CURRENT_WEEK || (process.env.NEXT_PUBLIC_CURRENT_WEEK || 0)) || 0;
      // prefer config file if available
      let configWeek = cw;
      try {
        // Try several likely filesystem locations for a local config file. Avoid bundler requires.
        const candidates = [
          path.join(process.cwd(), 'config', 'current-week.json'),
          path.join(process.cwd(), 'my-app', 'config', 'current-week.json'),
          path.join(__dirname, '..', '..', 'config', 'current-week.json'),
          path.join(__dirname, '..', '..', '..', 'config', 'current-week.json'),
        ];
        for (const pth of candidates) {
          try {
            if (fs.existsSync(pth)) {
              const raw = fs.readFileSync(pth, 'utf8');
              const cfg = JSON.parse(raw);
              if (cfg && cfg.currentWeek) {
                configWeek = Number(cfg.currentWeek);
                break;
              }
            }
          } catch (e) {
            // ignore parse/read errors and try next candidate
          }
        }
      } catch (e) {
        // ignore
      }
      const weekToCheck = configWeek || cw || 0;
      if (playerTeamId && weekToCheck) {
        try {
          const sch = await supabase.from('team_schedule').select('opponent_id').eq('team_id', playerTeamId).eq('week', weekToCheck).maybeSingle();
          if (sch?.data && sch.data.opponent_id) opponentId = sch.data.opponent_id;
        } catch (e) {
          // ignore
        }
      }

      // If we couldn't find an opponent via team_schedule, only use a player_stats
      // row if that row explicitly matches the configured current week. Otherwise
      // treat as a bye/missing schedule and do not infer opponent from past weeks.
      if (!opponentId && Array.isArray(rows) && rows.length > 0) {
        try {
          const candidate = rows.find((r: any) => Number(r.week) === Number(weekToCheck));
          if (candidate && typeof candidate.opponent === 'string') {
            const rawOpp = String(candidate.opponent).trim();
            if (rawOpp.toLowerCase() === 'bye') {
              opponentIsBye = true;
              opponentSource = 'player_stats.opponent';
            } else if (rawOpp.length > 0) {
              const norm = rawOpp.replace(/^@/, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
              if (norm.length > 0) {
                opponentId = norm;
                opponentSource = 'player_stats.opponent';
              }
            }
          } else {
            // No schedule row and no player_stats row for currentWeek -> bye or missing schedule
            opponentIsBye = true;
          }
        } catch (e) {
          opponentIsBye = true;
        }
      }

      if (opponentId) {
        provenance.opponentFetchedFrom = opponentSource || 'team_schedule';
      } else if (opponentIsBye) {
        provenance.opponentFetchedFrom = opponentSource || 'player_stats.opponent';
      }

      // fetch defense_averages for opponent and player's position
      if (opponentId && !opponentIsBye) {
        const pos = rows && rows[0] && rows[0].position_id ? rows[0].position_id : null;
        if (pos) {
          try {
            const def = await supabase.from('defense_averages').select('*').eq('team_id', opponentId).eq('position_id', pos).maybeSingle();
            if (def?.data) {
              opponentDefense = def.data;
              opponentDefenseSource = 'defense_averages';
            }
          } catch (e) {
            // ignore
          }
          // Try to fetch canonical defensive ranks from materialized view 'defense_rankings'
          try {
            const rankRes = await supabase.from('defense_rankings').select('pass_rank,rush_rank,receive_rank,composite_rank').eq('team_id', opponentId).eq('position_id', pos).maybeSingle();
            if (rankRes?.data) {
              opponentDefenseRank = rankRes.data;
              opponentRankSource = 'defense_rankings';
            }
          } catch (e) {
            // ignore; view may not exist or be missing in schema cache
          }
        }
      }

      // Validate player's team exists in canonical teams table
      try {
        if (playerTeamId) {
          const tcheck = await supabase.from('teams').select('team_id').eq('team_id', playerTeamId).maybeSingle();
          if (!tcheck || !tcheck.data) {
            teamMismatchWarning = `player team_id '${playerTeamId}' not found in teams table`;
          }
        }
      } catch (e) {
        // ignore
      }

      if (opponentDefenseSource) provenance.defenseFetchedFrom = opponentDefenseSource;
      if (opponentRankSource) provenance.defenseRankFetchedFrom = opponentRankSource;
    } catch (e) {
      // ignore
    }

    // Return rows as-is plus the source table and provenance/ opponent info
    return NextResponse.json({
      playerId: playerRow.id,
      rows,
      sourceTable,
      returnedSeason,
      playerTeamId,
      opponentId,
      opponentDefense,
      opponentDefenseRank,
      opponentIsBye,
      opponentSource,
      opponentDefenseSource,
      opponentRankSource,
      provenance,
      teamMismatchWarning,
    });
  } catch (err: any) {
    console.error('get-player-stats error:', err?.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
