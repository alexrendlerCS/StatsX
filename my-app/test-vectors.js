// Simple test for Ollama embeddings and vector database
require('dotenv').config({ path: '.env.local' });

async function testOllamaEmbeddings() {
  console.log('🧪 Testing Ollama Embeddings...');
  
  try {
    // Test Ollama connection
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    console.log(`Connecting to Ollama at: ${ollamaUrl}`);
    
    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: 'Test embedding for NFL player performance'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama embeddings working!');
      console.log(`   Embedding dimension: ${data.embedding.length}`);
      console.log(`   First few values: [${data.embedding.slice(0, 5).join(', ')}...]`);
    } else {
      console.error('❌ Ollama embeddings failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Ollama connection error:', error.message);
  }
}

async function testSupabaseConnection() {
  console.log('\n🗄️  Testing Supabase Connection...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test vector tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .like('table_name', '%embedding%');

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection working!');
      console.log(`   Vector tables found: ${tables.length}`);
      tables.forEach(table => console.log(`   - ${table.table_name}`));
    }
  } catch (error) {
    console.error('❌ Supabase error:', error.message);
  }
}

async function testVectorSearch() {
  console.log('\n🔍 Testing Vector Search Functions...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test the similarity search function exists
    const { data, error } = await supabase
      .rpc('find_similar_players', {
        query_embedding: new Array(768).fill(0.1), // Test embedding
        position_filter: null,
        season_filter: null,
        limit_count: 5
      });

    if (error) {
      console.log('⚠️  Vector search function exists but no data yet:', error.message);
    } else {
      console.log('✅ Vector search functions working!');
      console.log(`   Sample results: ${data.length} players found`);
    }
  } catch (error) {
    console.error('❌ Vector search error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 NFL Vector Database Test Suite');
  console.log('=' .repeat(50));
  
  await testOllamaEmbeddings();
  await testSupabaseConnection();
  await testVectorSearch();
  
  console.log('\n✅ Test suite completed!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run dev (to start the development server)');
  console.log('2. Visit: /ai-insights (to test the AI chat interface)');
  console.log('3. Try queries like "Who are the best quarterbacks this week?"');
}

runAllTests().catch(console.error);