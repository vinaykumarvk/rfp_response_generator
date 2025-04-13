#!/usr/bin/env python3
"""
Script to create embeddings table with vector support
This is needed because we're using the pgvector extension which requires special SQL
"""

import os
import sys
import psycopg2

def get_database_connection():
    """Get a connection to the PostgreSQL database."""
    try:
        # Get connection string from environment variable
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            print("DATABASE_URL environment variable not set")
            sys.exit(1)
        
        # Connect to the database
        conn = psycopg2.connect(db_url)
        print("Successfully connected to PostgreSQL database")
        return conn
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        sys.exit(1)

def create_embeddings_table():
    """Create the embeddings table with vector support."""
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        # Check if pgvector extension exists
        cursor.execute("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector');")
        extension_exists = cursor.fetchone()[0]
        
        if not extension_exists:
            print("Creating pgvector extension...")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            print("pgvector extension created successfully")
        else:
            print("pgvector extension already exists")
        
        # Create embeddings table with vector column
        print("Creating embeddings table...")
        cursor.execute("""
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
        """)
        print("Embeddings table created successfully")
        
        # Create index for faster vector similarity search
        print("Creating vector index for similarity search...")
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS embeddings_embedding_idx 
        ON embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
        """)
        print("Vector index created successfully")
        
        # Create text search indices for traditional search
        print("Creating text search indices...")
        cursor.execute("CREATE INDEX IF NOT EXISTS embeddings_category_idx ON embeddings (category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS embeddings_requirement_idx ON embeddings USING GIN (to_tsvector('english', requirement));")
        print("Text search indices created successfully")
        
        # Commit the changes
        conn.commit()
        print("All changes committed successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating embeddings table: {str(e)}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting to create embeddings table...")
    create_embeddings_table()
    print("Script completed successfully")