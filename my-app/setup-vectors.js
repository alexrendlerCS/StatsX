#!/usr/bin/env node

/**
 * NFL Vector Database Setup Script
 * 
 * This script helps set up and populate the vector database with NFL data embeddings.
 * 
 * Usage:
 *   npm run setup-vectors
 *   or
 *   node setup-vectors.js [command] [options]
 * 
 * Commands:
 *   init          - Initialize vector tables and indexes
 *   populate      - Populate embeddings from existing data
 *   test          - Test vector similarity search
 *   migrate       - Run database migrations
 */

// Dynamic import for ES modules
let nflVectorDB;
let createClient;
const fs = require('fs');
const path = require('path');

class VectorDatabaseSetup {
  constructor() {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    this.supabase = null;
    this.vectorDB = null;
  }

  async init() {
    // Initialize modules
    if (!this.supabase) {
      const supabaseModule = await import('@supabase/supabase-js');
      createClient = supabaseModule.createClient;
      
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    }
    
    if (!this.vectorDB) {
      const vectorModule = await import('./lib/vector-database.js');
      nflVectorDB = vectorModule.nflVectorDB;
      this.vectorDB = nflVectorDB;
    }
  }

  async init() {
    console.log('🚀 Initializing NFL Vector Database...');
    
    try {
      // Read and execute the SQL setup file
      const sqlPath = path.join(__dirname, 'pgvector_setup.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Split by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`📝 Executing ${statements.length} SQL statements...`);
      
      for (const statement of statements) {
        try {
          const { error } = await this.supabase.rpc('exec_sql', { sql: statement });
          if (error && !error.message.includes('already exists')) {
            console.warn(`⚠️  SQL Warning: ${error.message}`);
          }
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error(`❌ SQL Error:`, err.message);
          }
        }
      }
      
      console.log('✅ Vector database initialized successfully!');
      
    } catch (error) {
      console.error('❌ Failed to initialize vector database:', error);
      throw error;
    }
  }

  async populate(options = {}) {
    console.log('📊 Populating vector embeddings from NFL data...');
    
    const { 
      season = new Date().getFullYear(), 
      batchSize = 50,
      positions = ['QB', 'RB', 'WR', 'TE']
    } = options;

    try {
      // Check if we have an embedding service available
      console.log('🔍 Checking embedding service availability...');
      
      try {
        await nflVectorDB.generateEmbedding('test');
        console.log('✅ Embedding service is available');
      } catch (error) {
        console.log('⚠️  No embedding service available. Please set up OpenAI API key or local embeddings.');
        console.log('   Set OPENAI_API_KEY environment variable or run local embedding service.');
        return;
      }

      // Populate player performance embeddings
      await nflVectorDB.populatePlayerEmbeddings(season, batchSize);
      
      console.log('✅ Vector embeddings populated successfully!');
      
    } catch (error) {
      console.error('❌ Failed to populate embeddings:', error);
      throw error;
    }
  }

  async test() {
    console.log('🧪 Testing vector similarity search...');
    
    try {
      // Test player similarity search
      console.log('Testing player similarity search...');
      const similarPlayers = await nflVectorDB.findSimilarPlayers(
        'High scoring quarterback with multiple touchdowns',
        'QB',
        2025,
        5
      );
      
      console.log('📊 Similar players found:');
      similarPlayers.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.player_name} (${player.similarity_score.toFixed(3)} similarity)`);
        console.log(`     ${player.performance_summary}`);
      });

      // Test query caching
      console.log('\nTesting query caching...');
      const testQuery = 'Who are the best quarterbacks this week?';
      const cachedQueries = await nflVectorDB.findSimilarQueries(testQuery, 3, 0.7);
      
      console.log(`📝 Found ${cachedQueries.length} similar cached queries`);
      
      console.log('✅ Vector database tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Vector database tests failed:', error);
      throw error;
    }
  }

  async migrate() {
    console.log('🔄 Running vector database migrations...');
    
    try {
      // Check current schema version
      const { data: tables, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%embedding%');

      if (error) {
        throw error;
      }

      const existingTables = tables?.map(t => t.table_name) || [];
      console.log(`📊 Found ${existingTables.length} existing vector tables`);

      // Add any new columns or indexes needed
      const migrations = [
        // Add any future migrations here
      ];

      for (const migration of migrations) {
        try {
          const { error } = await this.supabase.rpc('exec_sql', { sql: migration });
          if (error) {
            console.warn(`⚠️  Migration warning: ${error.message}`);
          }
        } catch (err) {
          console.error(`❌ Migration error:`, err);
        }
      }
      
      console.log('✅ Migrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async status() {
    console.log('📊 NFL Vector Database Status');
    console.log('=' .repeat(50));
    
    try {
      // Check if pgvector is enabled
      const { data: extensions } = await this.supabase
        .rpc('select', { query: 'SELECT * FROM pg_extension WHERE extname = \'vector\'' });
      
      console.log(`pgvector extension: ${extensions?.length > 0 ? '✅ Enabled' : '❌ Not enabled'}`);
      
      // Check vector tables
      const vectorTables = [
        'player_performance_embeddings',
        'matchup_embeddings', 
        'team_performance_embeddings',
        'historical_context_embeddings',
        'ai_query_embeddings'
      ];
      
      for (const table of vectorTables) {
        try {
          const { count, error } = await this.supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            console.log(`${table}: ❌ Not found`);
          } else {
            console.log(`${table}: ✅ ${count} records`);
          }
        } catch (err) {
          console.log(`${table}: ❌ Error checking`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to get status:', error);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const command = process.argv[2] || 'status';
  const setup = new VectorDatabaseSetup();
  
  (async () => {
    try {
      switch (command) {
        case 'init':
          await setup.init();
          break;
        case 'populate':
          await setup.populate();
          break;
        case 'test':
          await setup.test();
          break;
        case 'migrate':
          await setup.migrate();
          break;
        case 'status':
          await setup.status();
          break;
        default:
          console.log('Available commands: init, populate, test, migrate, status');
      }
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { VectorDatabaseSetup };