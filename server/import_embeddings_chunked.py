#!/usr/bin/env python3
"""
Script to import embeddings from pickle file to PostgreSQL database in chunks
This script can be run multiple times to gradually import all embeddings
"""
import os
import sys
import json
import time
import pickle
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import execute_values

def get_database_connection():
    """Get a connection to the PostgreSQL database."""
    try:
        # Get the connection string from environment variable
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            sys.stderr.write("DATABASE_URL environment variable not set\n")
            sys.exit(1)
        
        # Connect to the database
        conn = psycopg2.connect(db_url)
        sys.stderr.write("Successfully connected to PostgreSQL database\n")
        return conn
    except Exception as e:
        sys.stderr.write(f"Error connecting to database: {str(e)}\n")
        sys.exit(1)

def load_pickle_embeddings():
    """Load embeddings from the pickle file."""
    try:
        # Look for the embeddings file in the current directory
        file_path = './rfp_embeddings.pkl'
        
        # Try to load the file
        with open(file_path, 'rb') as f:
            embeddings_data = pickle.load(f)
        
        sys.stderr.write("Successfully loaded embeddings from pickle file\n")
        return embeddings_data
    except Exception as e:
        sys.stderr.write(f"Error loading embeddings from pickle file: {str(e)}\n")
        sys.exit(1)

def import_embeddings_chunk(start_index=0, chunk_size=1000):
    """
    Import a chunk of embeddings from pickle file to PostgreSQL.
    
    Args:
        start_index: Starting index in the embeddings list
        chunk_size: Number of embeddings to import in this chunk
    
    Returns:
        The new starting index for the next chunk
    """
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
    
    # Get total number of points
    total_points = len(points)
    sys.stderr.write(f"Found {total_points} embeddings in pickle file\n")
    
    # Check if start_index is valid
    if start_index >= total_points:
        sys.stderr.write(f"Starting index {start_index} is beyond the total number of embeddings ({total_points})\n")
        sys.exit(0)
    
    # Adjust chunk_size if we're near the end
    remaining = total_points - start_index
    if chunk_size > remaining:
        chunk_size = remaining
    
    end_index = start_index + chunk_size
    sys.stderr.write(f"Processing embeddings from index {start_index} to {end_index-1} (total: {chunk_size})\n")
    
    # Select the current chunk
    current_chunk = points[start_index:end_index]
    
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
    
    # Create extension for text search if needed
    cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    
    # Prepare data for batch insertion
    batch_size = 50  # Smaller batches for less memory usage
    inserted_count = 0
    total_count = len(current_chunk)
    
    try:
        # Create summary table for categories
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS embedding_categories (
            category TEXT PRIMARY KEY,
            count INTEGER DEFAULT 0
        );
        """)
        
        # Start tracking unique categories
        categories = set()
        
        for i in range(0, len(current_chunk), batch_size):
            batch = current_chunk[i:i+batch_size]
            values = []
            
            for point in batch:
                vector = point.get('vector', [])
                payload = point.get('payload', {})
                
                # Extract fields from payload
                category = payload.get('category', 'Unknown')
                categories.add(category)
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
            progress = (inserted_count / total_count) * 100
            sys.stderr.write(f"Imported {inserted_count}/{total_count} embeddings ({progress:.1f}%)\n")
        
        # Create index if it doesn't exist
        try:
            cursor.execute("""
            CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
            ON embeddings 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
            """)
        except Exception as e:
            sys.stderr.write(f"Warning: Could not create vector index: {str(e)}\n")
            sys.stderr.write("Vector index will be created after more embeddings are inserted\n")
        
        # Create indexes for text searches as well
        cursor.execute("CREATE INDEX IF NOT EXISTS embeddings_category_idx ON embeddings(category);")
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS embeddings_requirement_idx ON embeddings USING gin(requirement gin_trgm_ops);")
        except Exception as e:
            sys.stderr.write(f"Warning: Could not create gin index: {str(e)}\n")
            sys.stderr.write("Text index will be created in a separate step\n")
        
        # Populate category statistics
        for category in categories:
            cursor.execute("""
            INSERT INTO embedding_categories (category, count)
            VALUES (%s, (SELECT COUNT(*) FROM embeddings WHERE category = %s))
            ON CONFLICT (category) DO UPDATE 
            SET count = (SELECT COUNT(*) FROM embeddings WHERE category = %s) + 
                        CASE WHEN excluded.count IS NULL THEN 0 ELSE excluded.count END;
            """, (category, category, category))
        
        conn.commit()
    except Exception as e:
        sys.stderr.write(f"Error during import: {str(e)}\n")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
    
    end_time = time.time()
    duration = end_time - start_time
    
    sys.stderr.write(f"Successfully imported {inserted_count} embeddings in {duration:.2f} seconds\n")
    
    # Return the next starting index
    return end_index

def get_current_count():
    """Get the current count of embeddings in the database."""
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT COUNT(*) FROM embeddings;")
        result = cursor.fetchone()
        count = result[0] if result else 0
        
        cursor.execute("SELECT MIN(id), MAX(id) FROM embeddings;")
        range_result = cursor.fetchone()
        id_min = range_result[0] if range_result and range_result[0] is not None else "N/A"
        id_max = range_result[1] if range_result and range_result[1] is not None else "N/A"
        
        # Get category counts
        cursor.execute("SELECT category, count FROM embedding_categories ORDER BY count DESC;")
        categories = cursor.fetchall()
        
        print(f"Current embeddings count: {count}")
        print(f"ID range: {id_min} to {id_max}")
        print("\nCategory distribution:")
        for category, cat_count in categories:
            print(f"  {category}: {cat_count}")
        
    except Exception as e:
        print(f"Error getting embeddings count: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def create_indexes():
    """Create or rebuild the required indexes."""
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("Creating/rebuilding indexes...")
        
        # Increase maintenance_work_mem temporarily for index creation
        try:
            cursor.execute("SHOW maintenance_work_mem;")
            original_mem = cursor.fetchone()[0]
            print(f"Current maintenance_work_mem: {original_mem}")
            
            # Set to 128MB temporarily
            cursor.execute("SET maintenance_work_mem = '128MB';")
            cursor.execute("SHOW maintenance_work_mem;")
            new_mem = cursor.fetchone()[0]
            print(f"Increased maintenance_work_mem to: {new_mem}")
            
            conn.commit()
        except Exception as e:
            print(f"Warning: Could not adjust maintenance_work_mem: {str(e)}")
            conn.rollback()
        
        # Create category index (simplest)
        try:
            cursor.execute("DROP INDEX IF EXISTS embeddings_category_idx;")
            cursor.execute("CREATE INDEX embeddings_category_idx ON embeddings(category);")
            conn.commit()
            print("Successfully created category index")
        except Exception as e:
            print(f"Error creating category index: {str(e)}")
            conn.rollback()
        
        # Create text search index
        try:
            # First make sure the extension exists
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            conn.commit()
            
            cursor.execute("DROP INDEX IF EXISTS embeddings_requirement_idx;")
            cursor.execute("CREATE INDEX embeddings_requirement_idx ON embeddings USING gin(requirement gin_trgm_ops);")
            conn.commit()
            print("Successfully created requirement gin index")
        except Exception as e:
            print(f"Error creating requirement index: {str(e)}")
            conn.rollback()
        
        # Create vector index (most complex)
        try:
            cursor.execute("DROP INDEX IF EXISTS embeddings_vector_idx;")
            cursor.execute("""
            CREATE INDEX embeddings_vector_idx 
            ON embeddings 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
            """)
            conn.commit()
            print("Successfully created vector index")
        except Exception as e:
            print(f"Error creating vector index: {str(e)}")
            # If vector index fails, try with ivfflat with fewer lists
            try:
                print("Retrying with smaller lists parameter...")
                cursor.execute("DROP INDEX IF EXISTS embeddings_vector_idx;")
                cursor.execute("""
                CREATE INDEX embeddings_vector_idx 
                ON embeddings 
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 50);
                """)
                conn.commit()
                print("Successfully created vector index with reduced lists")
            except Exception as e2:
                print(f"Error creating vector index with reduced lists: {str(e2)}")
                conn.rollback()
                
                # If that fails too, try with hnsw index type
                try:
                    print("Trying HNSW index type instead...")
                    cursor.execute("DROP INDEX IF EXISTS embeddings_vector_idx;")
                    cursor.execute("""
                    CREATE INDEX embeddings_vector_idx 
                    ON embeddings 
                    USING hnsw (embedding vector_cosine_ops)
                    WITH (m = 16, ef_construction = 64);
                    """)
                    conn.commit()
                    print("Successfully created HNSW vector index")
                except Exception as e3:
                    print(f"Error creating HNSW vector index: {str(e3)}")
                    conn.rollback()
            
        # Reset maintenance_work_mem to original value
        try:
            cursor.execute(f"SET maintenance_work_mem = '{original_mem}';")
            print(f"Reset maintenance_work_mem to original value: {original_mem}")
            conn.commit()
        except Exception as e:
            print(f"Warning: Could not reset maintenance_work_mem: {str(e)}")
    except Exception as e:
        print(f"Error during index creation: {str(e)}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Import embeddings in chunks')
    parser.add_argument('--start', type=int, default=0, help='Starting index')
    parser.add_argument('--size', type=int, default=1000, help='Chunk size')
    parser.add_argument('--count', action='store_true', help='Just show the current count')
    parser.add_argument('--indexes', action='store_true', help='Create/rebuild indexes')
    
    args = parser.parse_args()
    
    if args.count:
        get_current_count()
    elif args.indexes:
        create_indexes()
    else:
        next_index = import_embeddings_chunk(args.start, args.size)
        print(f"\nNext chunk starting index: {next_index}")