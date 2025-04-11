#!/usr/bin/env python3
"""
Script to fix and test vector search functionality
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

def get_database_connection():
    """Get a connection to the PostgreSQL database."""
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        sys.stderr.write("ERROR: DATABASE_URL environment variable not set\n")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(database_url)
        print("Successfully connected to PostgreSQL database")
        return conn
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        sys.exit(1)

def test_existing_vector():
    """Test vector search using an existing vector from the database"""
    conn = get_database_connection()
    cursor = conn.cursor()
    
    # Get the first vector from the database
    try:
        cursor.execute("SELECT id, embedding FROM embeddings LIMIT 1")
        row = cursor.fetchone()
        if not row:
            print("No vectors found in database")
            return
            
        id, embedding = row
        print(f"Got reference vector from record #{id}")
        
        # Use the existing vector for searching
        search_cursor = conn.cursor(cursor_factory=RealDictCursor)
        search_cursor.execute("""
        SELECT 
            id, 
            category, 
            requirement,
            1 - (embedding <=> %s) as similarity 
        FROM 
            embeddings
        ORDER BY 
            embedding <=> %s
        LIMIT 5
        """, (embedding, embedding))
        
        results = search_cursor.fetchall()
        print(f"\nSearch with existing vector returned {len(results)} results:")
        
        for i, result in enumerate(results, 1):
            print(f"{i}. [{result['category']}] {result['requirement'][:50]}... (score: {result['similarity']:.3f})")
            
        # Now test a simple search for top 5 most similar to the same vector, without threshold
        print("\nLet's try a simplified approach without filtering in Python...")
        test_cursor = conn.cursor(cursor_factory=RealDictCursor)
        test_cursor.execute("""
        SELECT 
            id, 
            category, 
            requirement,
            1 - (embedding <=> %s) as similarity 
        FROM 
            embeddings
        ORDER BY 
            embedding <=> %s
        LIMIT 5
        """, (embedding, embedding))
        
        results = test_cursor.fetchall()
        print(f"Simplified search returned {len(results)} results:")
        
        for i, result in enumerate(results, 1):
            print(f"{i}. [{result['category']}] {result['requirement'][:50]}... (score: {result['similarity']:.3f})")
        
    except Exception as e:
        print(f"Error during test: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def test_random_vector():
    """Test vector search using a random vector that should work better"""
    import random
    
    print("\n=== Testing Vector Search with Random Vector ===\n")
    
    conn = get_database_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Generate a random vector
        # Use a fixed seed for reproducibility
        random.seed(42)
        
        # Create normalized random vector
        vec = [random.uniform(-1, 1) for _ in range(1536)]
        magnitude = sum(x*x for x in vec) ** 0.5
        vec = [x/magnitude for x in vec]
        
        # Format for PostgreSQL
        vec_str = f"[{','.join(str(x) for x in vec)}]"
        
        print("Generated random vector with magnitude 1.0")
        
        # Try with TOP 5 without filtering by threshold
        query = """
        SELECT 
            id, 
            category, 
            requirement,
            1 - (embedding <=> %s::vector) as similarity 
        FROM 
            embeddings
        ORDER BY 
            embedding <=> %s::vector
        LIMIT 5
        """
        
        cursor.execute(query, (vec_str, vec_str))
        results = cursor.fetchall()
        
        print(f"Random vector search returned {len(results)} results:")
        for i, result in enumerate(results, 1):
            print(f"{i}. [{result['category']}] {result['requirement'][:50]}... (score: {result['similarity']:.3f})")
            
        # Now extract a real embedding from the database and modify it slightly
        # This should give us better results than pure random
        cursor.execute("SELECT embedding FROM embeddings LIMIT 1")
        real_vec = cursor.fetchone()['embedding']
        
        if real_vec:
            print("\nTrying with a modified real vector...")
            
            # Convert to string, add a bit of noise
            real_vec_list = eval(str(real_vec))
            
            # Add some noise
            noisy_vec = [x + random.uniform(-0.05, 0.05) for x in real_vec_list]
            
            # Normalize again
            magnitude = sum(x*x for x in noisy_vec) ** 0.5
            noisy_vec = [x/magnitude for x in noisy_vec]
            
            # Format for PostgreSQL
            noisy_vec_str = f"[{','.join(str(x) for x in noisy_vec)}]"
            
            cursor.execute(query, (noisy_vec_str, noisy_vec_str))
            results = cursor.fetchall()
            
            print(f"Modified real vector search returned {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"{i}. [{result['category']}] {result['requirement'][:50]}... (score: {result['similarity']:.3f})")
        
    except Exception as e:
        print(f"Error during random vector test: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def run_diagnostic_queries():
    """Run additional diagnostic queries to understand the database state"""
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        # Check if the embeddings table exists
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'embeddings')")
        table_exists = cursor.fetchone()[0]
        print(f"Embeddings table exists: {table_exists}")
        
        if not table_exists:
            print("Embeddings table doesn't exist - vector search cannot work!")
            return
            
        # Check if the pgvector extension is installed
        cursor.execute("SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')")
        extension_exists = cursor.fetchone()[0]
        print(f"Vector extension installed: {extension_exists}")
        
        if not extension_exists:
            print("Vector extension not installed - vector search cannot work!")
            return
            
        # Check row count
        cursor.execute("SELECT COUNT(*) FROM embeddings")
        row_count = cursor.fetchone()[0]
        print(f"Embeddings table has {row_count} rows")
        
        # Check vector dimension 
        cursor.execute("SELECT typelem FROM pg_type WHERE typname = 'vector'")
        vector_type = cursor.fetchone()
        print(f"Vector type info: {vector_type}")
        
        # Check for nulls
        cursor.execute("SELECT COUNT(*) FROM embeddings WHERE embedding IS NULL")
        null_count = cursor.fetchone()[0]
        print(f"Embeddings with NULL vectors: {null_count}")
        
        # Check indexes
        cursor.execute("""
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'embeddings'
        """)
        indexes = cursor.fetchall()
        print(f"\nFound {len(indexes)} indexes:")
        for idx in indexes:
            print(f"- {idx[0]}: {idx[1]}")
            
    except Exception as e:
        print(f"Error during diagnostics: {str(e)}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=== Running Vector Search Diagnostics ===\n")
    
    # Run diagnostic queries
    run_diagnostic_queries()
    
    print("\n=== Testing Vector Search with Existing Vector ===\n")
    # Test with an existing vector
    test_existing_vector()
    
    # Test with random vectors
    test_random_vector()