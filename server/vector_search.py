#!/usr/bin/env python3
"""
Vector search utility for finding similar requirements
This module provides functions for vector similarity search in PostgreSQL
"""

import os
import sys
import json
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from openai import OpenAI

# Constants
DEFAULT_SIMILARITY_THRESHOLD = 0.3
DEFAULT_TOP_K = 5

def get_database_connection():
    """Get a connection to the PostgreSQL database."""
    try:
        # Get connection string from environment variable
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            sys.stderr.write("DATABASE_URL environment variable not set\n")
            return None
        
        # Connect to the database
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        sys.stderr.write(f"Error connecting to database: {str(e)}\n")
        return None

def get_embedding_from_openai(text):
    """Generate an embedding vector for the provided text using OpenAI API"""
    try:
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        embedding = response.data[0].embedding
        sys.stderr.write(f"Generated embedding with {len(embedding)} dimensions\n")
        return embedding
    except Exception as e:
        sys.stderr.write(f"Error generating embedding: {str(e)}\n")
        return None

def find_similar_requirements(query_text, k=DEFAULT_TOP_K, similarity_threshold=DEFAULT_SIMILARITY_THRESHOLD):
    """
    Find similar requirements using vector search
    
    Args:
        query_text: The text to find similar requirements for
        k: Maximum number of results to return
        similarity_threshold: Minimum similarity score to include in results
        
    Returns:
        List of similar requirements with metadata and similarity scores
    """
    # Get embedding for the query text
    query_embedding = get_embedding_from_openai(query_text)
    if not query_embedding:
        return []
    
    # Find similar requirements using the embedding
    return find_similar_requirements_db(query_embedding, k, similarity_threshold)

def find_similar_requirements_db(query_embedding, k=DEFAULT_TOP_K, similarity_threshold=DEFAULT_SIMILARITY_THRESHOLD):
    """
    Find similar requirements in the database using vector similarity search
    
    Args:
        query_embedding: The embedding vector to search with
        k: Maximum number of results to return
        similarity_threshold: Minimum similarity score to include in results
        
    Returns:
        List of similar requirements with metadata and similarity scores
    """
    try:
        conn = get_database_connection()
        if not conn:
            return []
        
        cursor = conn.cursor()
        
        # Normalize the embedding vector
        try:
            magnitude = sum(x*x for x in query_embedding) ** 0.5
            if magnitude > 0:
                query_embedding = [x/magnitude for x in query_embedding]
                sys.stderr.write("Query vector normalized successfully\n")
            else:
                sys.stderr.write("Error: Zero magnitude vector\n")
                return []
        except Exception as e:
            sys.stderr.write(f"Error normalizing query vector: {str(e)}\n")
            return []
        
        # Convert embedding to string for PostgreSQL
        embedding_str = f"[{','.join(str(x) for x in query_embedding)}]"
        
        # Query for similar vectors using cosine similarity
        query = """
        SELECT 
            id,
            category,
            requirement,
            response,
            reference,
            embedding <=> %s::vector as distance
        FROM 
            embeddings
        ORDER BY 
            embedding <=> %s::vector
        LIMIT %s
        """
        
        cursor.execute(query, (embedding_str, embedding_str, k))
        results = cursor.fetchall()
        
        if not results:
            sys.stderr.write("No similar requirements found\n")
            return []
        
        # Calculate actual similarity (1 - distance) for better interpretability
        # PostgreSQL returns distance, not similarity
        top_similarity = 1 - results[0][5]
        lowest_similarity = 1 - results[-1][5]
        
        sys.stderr.write(f"Top similarity score: {top_similarity}\n")
        sys.stderr.write(f"Lowest similarity score: {lowest_similarity}\n")
        
        # Convert to list of dictionaries
        similar_requirements = []
        for row in results:
            id, category, requirement, response, reference, distance = row
            similarity = 1 - distance  # Convert distance to similarity
            
            # Only include results above the similarity threshold
            if similarity >= similarity_threshold:
                similar_requirements.append({
                    'id': id,
                    'category': category,
                    'requirement': requirement,
                    'response': response,
                    'reference': reference,
                    'similarity': similarity,
                    'score': similarity,  # Alias for compatibility
                    'text': f"{category} | {requirement}"  # Format for compatibility
                })
        
        sys.stderr.write(f"Returning {len(similar_requirements)} results\n")
        
        cursor.close()
        conn.close()
        return similar_requirements
    
    except Exception as e:
        sys.stderr.write(f"Error in vector search: {str(e)}\n")
        return []

# Test function
if __name__ == "__main__":
    test_query = "Describe your platform's document management capabilities"
    print(f"Testing vector search with query: {test_query}")
    
    results = find_similar_requirements(test_query)
    
    print(f"Found {len(results)} similar requirements")
    for i, result in enumerate(results, 1):
        print(f"\nResult {i}:")
        print(f"  Category: {result['category']}")
        print(f"  Requirement: {result['requirement'][:100]}...")
        print(f"  Similarity: {result['similarity']:.4f}")
        if result['response']:
            print(f"  Response: {result['response'][:100]}...")
        else:
            print("  No response available")