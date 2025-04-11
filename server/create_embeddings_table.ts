import { db, pool } from './db';
import { sql } from 'drizzle-orm';

/**
 * Script to create embeddings table with vector support
 * This is needed because we're using the pgvector extension which requires special SQL
 */
async function createEmbeddingsTable() {
  try {
    console.log('Creating embeddings table with vector support...');
    
    // First ensure the vector extension is installed
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    
    // Create the embeddings table with a vector column for storing embeddings
    const createTableSQL = sql`
      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        requirement TEXT NOT NULL,
        response TEXT NOT NULL,
        reference TEXT,
        payload TEXT NOT NULL,
        embedding VECTOR(1536) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    await db.execute(createTableSQL);
    
    // Create an index for faster vector similarity searches
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
      ON embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    
    console.log('Successfully created embeddings table with vector support!');
  } catch (error) {
    console.error('Error creating embeddings table:', error);
    throw error;
  } finally {
    // Don't close the pool here if it's shared with other parts of the application
    // await pool.end();
  }
}

// Export the function so it can be called from other files
export { createEmbeddingsTable };

// Run the migration if this script is called directly
if (require.main === module) {
  createEmbeddingsTable()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}