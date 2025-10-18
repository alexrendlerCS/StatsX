export type ToolSpec<A = any> = {
  name: string;
  description: string;
  validateArgs: (raw: any) => { ok: true; args: A } | { ok: false; error: string };
  call: (args: A) => Promise<{
    success: boolean;
    data?: any;
    meta?: { source: 'supabase' | 'rpc' | 'cache'; rowCount?: number; tookMs?: number };
    error?: { code: string; message: string };
  }>;
};

// --- Helpers
const isInt = (n: any) => Number.isInteger(n);
const sanitizeName = (s: any) => (typeof s === 'string' ? s.trim() : '');

async function postJSON(path: string, body: any) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
  const url = path.startsWith('http') ? path : new URL(path, base).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

// --- Tool: get_player_stats
type GetPlayerStatsArgs = {
  playerName: string;
  season?: number;
  weeks?: number[];
  limit?: number;
  offset?: number;
};

export const tools: Record<string, ToolSpec> = {
  get_player_stats: {
    name: 'get_player_stats',
    description: 'Recent player game logs and usage.',
    validateArgs(raw: any) {
      const playerName = sanitizeName(raw?.playerName);
      if (!playerName) return { ok: false, error: 'playerName required' } as any;

      let season: number | undefined = undefined;
      if (raw?.season !== undefined) {
        if (!isInt(raw.season)) return { ok: false, error: 'season must be integer' } as any;
        season = raw.season;
      }

      let weeks: number[] | undefined = undefined;
      if (raw?.weeks !== undefined) {
        if (!Array.isArray(raw.weeks) || !raw.weeks.every(isInt)) {
          return { ok: false, error: 'weeks must be array of integers' } as any;
        }
        weeks = raw.weeks;
      }

      let limit = 50;
      if (raw?.limit !== undefined) {
        if (!isInt(raw.limit)) return { ok: false, error: 'limit must be integer' } as any;
        limit = Math.max(1, Math.min(500, raw.limit));
      }
      let offset = 0;
      if (raw?.offset !== undefined) {
        if (!isInt(raw.offset) || raw.offset < 0) return { ok: false, error: 'offset must be non-negative integer' } as any;
        offset = raw.offset;
      }

      return { ok: true, args: { playerName, season, weeks, limit, offset } } as any;
    },
    async call(args: GetPlayerStatsArgs) {
      const t0 = Date.now();
      const { status, json } = await postJSON('/api/tools/get-player-stats', args);
      const tookMs = Math.round(Date.now() - t0);
      // Return the tool response body even on non-200 so callers can inspect candidates/error payloads.
      if (status !== 200) {
        return {
          success: false,
          data: json,
          error: { code: String(status), message: json?.error || 'tool failed' },
          meta: { source: 'supabase', rowCount: json?.rows?.length ?? 0, tookMs, status },
        };
      }
      return {
        success: true,
        data: json,
        meta: { source: 'supabase', rowCount: json?.rows?.length ?? 0, tookMs, status },
      };
    },
  },
  // Additional tools can be added here (rag_search, get_baseline_projection, etc.)
};

export type ToolName = keyof typeof tools;
