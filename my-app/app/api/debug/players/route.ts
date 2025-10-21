import { NextRequest, NextResponse } from 'next/server';

// This route uses Request properties (e.g., request.url) and must be handled
// dynamically at runtime. Force dynamic rendering to avoid static prerendering
// errors during build.
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    if (!q) return NextResponse.json({ error: 'q param is required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Dev mock fallback
    const useMock = !!process.env.DEV_USE_MOCK_DB;
    if (useMock) {
      const mock = [
        { id: 'p_derrick_henry', name: 'Derrick Henry' },
        { id: 'p_d.henry', name: 'D. Henry' },
      ];
      return NextResponse.json({ q, count: mock.length, rows: mock });
    }

    const { data, error } = await supabase
      .from('players')
      .select('id,name')
      .ilike('name', `%${q}%`)
      .limit(50);

    if (error) {
      console.error('debug players search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ q, count: data?.length ?? 0, rows: data ?? [] });
  } catch (err: any) {
    console.error('debug players exception:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
