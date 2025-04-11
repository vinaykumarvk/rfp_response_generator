#!/usr/bin/env python3
"""
Script to import embeddings from pickle file to PostgreSQL database
"""
import os
import sys
import pickle
import json
import time
import psycopg2
from psycopg2.extras import execute_values
import numpy as np

# Constants - use the same paths as the main script for consistency
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBEDDING_FILE_PATH = os.path.join(BASE_DIR, "rfp_embeddings.pkl")

def get_database_connection():
    """Get a connection to the PostgreSQL database."""
    # Use the DATABASE_URL environment variable (Replit sets this)
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        sys.stderr.write("ERROR: DATABASE_URL environment variable not set\n")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(database_url)
        sys.stderr.write("Successfully connected to PostgreSQL database\n")
        return conn
    except Exception as e:
        sys.stderr.write(f"Error connecting to database: {str(e)}\n")
        sys.exit(1)

def load_pickle_embeddings():
    """Load embeddings from the pickle file."""
    try:
        if not os.path.exists(EMBEDDING_FILE_PATH):
            sys.stderr.write(f"Embeddings file not found at: {EMBEDDING_FILE_PATH}\n")
            sys.exit(1)
            
        with open(EMBEDDING_FILE_PATH, 'rb') as f:
            data = pickle.load(f)
            
        sys.stderr.write(f"Successfully loaded embeddings from pickle file\n")
        return data
    except Exception as e:
        sys.stderr.write(f"Error loading embeddings from pickle file: {str(e)}\n")
        sys.exit(1)

def import_embeddings_to_postgres():
    """Import embeddings from pickle file to PostgreSQL."""
    start_time = time.time()
    
    # Connect to the database
    conn = get_database_connection()
    cursor = conn.cursor()
    
    # Load embeddings from pickle file
    embeddings_data = load_pickle_embeddings()
    points = embeddings_data.get('points', [])
    
    if not points:
        sys.stderr.write("No embeddings data found in pickle file\n")
        sys.exit(1)
    
    sys.stderr.write(f"Found {len(points)} embeddings to import\n")
    
    # Ensure the extension and table exist
    cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    cursor.execute("""
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
    """)
    
    # Prepare data for batch insertion
    batch_size = 100
    inserted_count = 0
    total_count = len(points)
    
    # First, check if we already have data
    cursor.execute("SELECT COUNT(*) FROM embeddings;")
    existing_count = cursor.fetchone()[0]
    
    if existing_count > 0:
        sys.stderr.write(f"Found {existing_count} existing embeddings in database.\n")
        user_input = input("Delete existing embeddings before importing? (y/n): ")
        if user_input.lower() == 'y':
            cursor.execute("DELETE FROM embeddings;")
            conn.commit()
            sys.stderr.write("Deleted existing embeddings.\n")
    
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        values = []
        
        for point in batch:
            vector = point.get('vector', [])
            payload = point.get('payload', {})
            
            # Extract fields from payload
            category = payload.get('category', 'Unknown')
            requirement = payload.get('requirement', '')
            response = payload.get('response', '')
            reference = payload.get('reference', '')
            
            # Convert payload to JSON string
            payload_json = json.dumps(payload)
            
            # Convert vector to string representation for PostgreSQL
            vector_str = f"[{','.join(str(x) for x in vector)}]"
            
            values.append((
                category,
                requirement, 
                response,
                reference,
                payload_json,
                vector_str
            ))
        
        # Insert batch
        execute_values(
            cursor,
            """
            INSERT INTO embeddings 
            (category, requirement, response, reference, payload, embedding)
            VALUES %s
            """,
            values,
            template="(%s, %s, %s, %s, %s, %s::vector)"
        )
        
        # Commit after each batch
        conn.commit()
        
        inserted_count += len(batch)
        sys.stderr.write(f"Imported {inserted_count}/{total_count} embeddings ({inserted_count/total_count*100:.1f}%)\n")
    
    # Create index if it doesn't exist
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
    ON embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    end_time = time.time()
    duration = end_time - start_time
    
    sys.stderr.write(f"Successfully imported {inserted_count} embeddings in {duration:.2f} seconds\n")

if __name__ == "__main__":
    # Run the import process
    import_embeddings_to_postgres()