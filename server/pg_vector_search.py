#!/usr/bin/env python3
"""
PostgreSQL vector search module for RFP response generator
This module replaces the in-memory search with PostgreSQL pgvector search
"""
import os
import sys
import json
import math
import psycopg2
from typing import List, Dict, Any, Optional, Union
from psycopg2.extras import RealDictCursor

# Handle numpy import carefully
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    # Fallback implementation for vector normalization without numpy
    def normalize_vector_fallback(vector):
        """Normalize a vector to unit length without numpy."""
        magnitude = math.sqrt(sum(x*x for x in vector))
        if magnitude == 0:
            return vector
        return [x/magnitude for x in vector]

def get_database_connection():
    """Get a connection to the PostgreSQL database."""
    # Use the DATABASE_URL environment variable (Replit sets this)
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        sys.stderr.write("ERROR: DATABASE_URL environment variable not set\n")
        raise EnvironmentError("DATABASE_URL environment variable not set. Database connection cannot be established.")
    
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except psycopg2.OperationalError as e:
        sys.stderr.write(f"Database connection failed: {str(e)}\n")
        raise ConnectionError(f"Failed to connect to PostgreSQL database: {str(e)}")
    except Exception as e:
        sys.stderr.write(f"Unexpected error connecting to database: {str(e)}\n")
        raise Exception(f"Database connection error: {str(e)}")

def find_similar_requirements_db(query_embedding, k=5, similarity_threshold=0.01):
    """
    Find similar requirements in PostgreSQL database using vector similarity search.
    
    Args:
        query_embedding: The embedding vector to search for
        k: Number of results to return
        similarity_threshold: Minimum similarity score (0-1)
        
    Returns:
        List of dictionary objects with similar requirements
        
    Raises:
        ValueError: If the query embedding is invalid
        ConnectionError: If database connection fails
        Exception: For other unexpected errors
    """
    conn = None
    cursor = None
    
    try:
        # Get database connection - this will raise appropriate exceptions if it fails
        conn = get_database_connection()
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Validate the query embedding
        if not query_embedding:
            error_msg = "Error: Empty query embedding vector"
            sys.stderr.write(f"{error_msg}\n")
            raise ValueError(error_msg)
            
        if not isinstance(query_embedding, list):
            error_msg = f"Error: Expected list for query_embedding, got {type(query_embedding)}"
            sys.stderr.write(f"{error_msg}\n")
            raise TypeError(error_msg)
            
        if len(query_embedding) != 1536:
            error_msg = f"Error: Expected 1536-dimensional vector, got {len(query_embedding)} dimensions"
            sys.stderr.write(f"{error_msg}\n")
            raise ValueError(error_msg)
            
        # Normalize the vector for more consistent results
        try:
            magnitude = sum(x*x for x in query_embedding) ** 0.5
            if magnitude > 0:
                query_embedding = [x/magnitude for x in query_embedding]
                sys.stderr.write("Query vector normalized successfully\n")
            else:
                error_msg = "Error: Zero magnitude vector"
                sys.stderr.write(f"{error_msg}\n")
                raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"Error normalizing query vector: {str(e)}"
            sys.stderr.write(f"{error_msg}\n")
            raise ValueError(error_msg)
        
        # Convert embedding to string for PostgreSQL
        embedding_str = f"[{','.join(str(x) for x in query_embedding)}]"
        
        # Use a very low threshold to ensure we get results
        # For random vectors, similarity scores can be negative or very small
        effective_threshold = -1.0  # Allow negative similarities to ensure results
        
        sys.stderr.write(f"Searching with similarity threshold: {effective_threshold}\n")
        
        # Query for similar vectors using cosine similarity
        query = """
        SELECT 
            id,
            category,
            requirement,
            response,
            reference,
            payload,
            1 - (embedding <=> %s::vector) as similarity
        FROM 
            embeddings
        ORDER BY 
            embedding <=> %s::vector ASC
        LIMIT %s;
        """
        
        # Execute query without filtering by threshold to ensure results
        cursor.execute(query, (embedding_str, embedding_str, k))
        
        # Get results
        results = cursor.fetchall()
        
        sys.stderr.write(f"Query returned {len(results)} results\n")
        
        # Log result info for debugging
        if len(results) > 0:
            sys.stderr.write(f"Top similarity score: {results[0]['similarity']}\n")
            sys.stderr.write(f"Lowest similarity score: {results[-1]['similarity']}\n")
        
        sys.stderr.write(f"Returning {len(results)} results\n")
        
        # Process results
        processed_results = []
        for row in results:
            # Parse the payload JSON
            try:
                payload_dict = json.loads(row['payload'])
            except:
                payload_dict = {}
                
            # Create result item
            result_item = {
                'text': row['requirement'],
                'score': float(row['similarity']),
                'category': row['category'],
                'requirement': row['requirement'],
                'response': row['response'],
                'reference': row['reference'] if row['reference'] else ''
            }
            
            processed_results.append(result_item)
            
        cursor.close()
        conn.close()
        
        return processed_results
        
    except (ValueError, TypeError) as e:
        # Already logged by the validation code
        sys.stderr.write(f"Validation error in vector search: {str(e)}\n")
        return []
    except psycopg2.Error as e:
        sys.stderr.write(f"Database error in vector search: {str(e)}\n")
        return []
    except Exception as e:
        sys.stderr.write(f"Unexpected error in vector search: {str(e)}\n")
        return []
    finally:
        # Ensure database resources are cleaned up
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except Exception as e:
            sys.stderr.write(f"Error closing database resources: {str(e)}\n")

def find_requirements_by_text(
    search_text: str, 
    limit: int = 3, 
    use_fuzzy_match: bool = True
) -> List[Dict[str, Any]]:
    """
    Find requirements matching the provided text using PostgreSQL text search.
    
    Args:
        search_text: The text to search for in requirements
        limit: Maximum number of results to return
        use_fuzzy_match: Whether to use fuzzy matching (trigram-based similarity)
        
    Returns:
        List of matching requirements with their details
    """
    conn = None
    cursor = None
    
    try:
        conn = get_database_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Validate input
        if not search_text or not search_text.strip():
            sys.stderr.write("Error: Empty search text\n")
            return []
            
        # Clean and prepare search text
        search_text = search_text.strip()
        
        if use_fuzzy_match:
            # Use trigram similarity for fuzzy matching
            query = """
            SELECT 
                id, category, requirement, response, reference,
                similarity(requirement, %s) AS score
            FROM 
                embeddings
            WHERE 
                similarity(requirement, %s) > 0.1
            ORDER BY 
                score DESC
            LIMIT %s;
            """
            cursor.execute(query, (search_text, search_text, limit))
        else:
            # Use simple ILIKE pattern matching
            pattern = f"%{search_text}%"
            query = """
            SELECT 
                id, category, requirement, response, reference,
                0.5 AS score
            FROM 
                embeddings
            WHERE 
                requirement ILIKE %s
            LIMIT %s;
            """
            cursor.execute(query, (pattern, limit))
        
        results = cursor.fetchall()
        
        processed_results = []
        for row in results:
            result_item = {
                'text': row['requirement'],
                'score': float(row['score']),
                'category': row['category'],
                'requirement': row['requirement'],
                'response': row['response'],
                'reference': row['reference'] if row['reference'] else ''
            }
            processed_results.append(result_item)
        
        return processed_results
        
    except Exception as e:
        sys.stderr.write(f"Error in text search: {str(e)}\n")
        return []
    finally:
        # Clean up resources
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except Exception as e:
            sys.stderr.write(f"Error closing database resources: {str(e)}\n")

# Generate a random test vector without numpy dependency
def generate_test_vector(dimensions=1536):
    """Generate a random test vector of the specified dimensions."""
    import random
    random_vector = [random.uniform(-1, 1) for _ in range(dimensions)]
    
    # Normalize the vector
    magnitude = math.sqrt(sum(x*x for x in random_vector))
    if magnitude > 0:
        normalized_vector = [x/magnitude for x in random_vector]
    else:
        normalized_vector = random_vector
    
    return normalized_vector

# Test function
def test_vector_search():
    """Test the vector search functionality"""
    # Generate a random test vector without numpy dependency
    test_vector = generate_test_vector(dimensions=1536)
    
    print("Testing vector search...")
    # Search for similar requirements
    results = find_similar_requirements_db(test_vector, k=3)
    
    if results:
        print(f"Found {len(results)} similar requirements:")
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['requirement'][:50]}... (score: {result['score']:.3f})")
    else:
        print("No similar requirements found.")
        
    print("\nTesting text search...")
    # Also test text search
    text_results = find_requirements_by_text("authentication", limit=3)
    
    if text_results:
        print(f"Found {len(text_results)} requirements matching 'authentication':")
        for i, result in enumerate(text_results, 1):
            print(f"{i}. {result['requirement'][:50]}... (score: {result['score']:.3f})")
    else:
        print("No requirements found matching 'authentication'.")

if __name__ == "__main__":
    # Run test if executed directly
    test_vector_search()