/**
 * Script to create embeddings table with vector support
 * This is needed because we're using the pgvector extension which requires special SQL
 */
import { pool } from './db.js';

async function createEmbeddingsTable() {
  const client = await pool.connect();
  try {
    console.log('Starting to create embeddings table...');
    
    // Check if pgvector extension exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      );
    `);
    
    const extensionExists = checkResult.rows[0].exists;
    
    if (!extensionExists) {
      console.log('Creating pgvector extension...');
      // Create the vector extension if it doesn't exist
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('pgvector extension created successfully');
    } else {
      console.log('pgvector extension already exists');
    }
    
    // Create embeddings table with vector column
    console.log('Creating embeddings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        requirement TEXT NOT NULL,
        response TEXT,
        reference TEXT,
        payload JSONB,
        embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Embeddings table created successfully');
    
    // Create index for faster vector similarity search
    console.log('Creating vector index for similarity search...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS embeddings_embedding_idx 
      ON embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log('Vector index created successfully');
    
    // Create text search indices for traditional search
    console.log('Creating text search indices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS embeddings_category_idx ON embeddings (category);
      CREATE INDEX IF NOT EXISTS embeddings_requirement_idx ON embeddings USING GIN (to_tsvector('english', requirement));
    `);
    console.log('Text search indices created successfully');
    
    console.log('Embeddings table and indices created successfully');
  } catch (error) {
    console.error('Error creating embeddings table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createEmbeddingsTable()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

export { createEmbeddingsTable };