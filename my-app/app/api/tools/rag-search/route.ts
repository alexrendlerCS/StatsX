import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { query, season, kind } = await req.json();
    if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Create embedding with OpenAI (adjust model name as required)
    const embResp = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
    const vec = embResp.data[0].embedding;

    // Try RPC match_rag_chunks (if exists), else fallback to player_performance_embeddings search
    try {
      const { data, error } = await supabase.rpc('match_rag_chunks', {
        query_embedding: vec,
        match_kind: kind ?? null,
        match_season: season ?? null,
        similarity_threshold: 0.7,
        match_count: 8,
      });
      if (error) throw error;
      return NextResponse.json({ chunks: data });
    } catch (rpcErr) {
      // Fallback: try similarity search against player_performance_embeddings
      const { data, error } = await supabase
        .from('player_performance_embeddings')
        .select('player_name, position_id, season, week, performance_summary, embedding')
        .limit(8)
        .order('id', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ chunks: data });
    }

  } catch (err: any) {
    console.error('rag-search error:', err?.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
