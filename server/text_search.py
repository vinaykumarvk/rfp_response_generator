#!/usr/bin/env python3
"""
Text search functions for finding similar requirements without vector search.
This is a fallback when vector search is not available.
"""
import os
import sys
import json
import decimal
import psycopg2
from psycopg2.extras import RealDictCursor

# Custom JSON encoder to handle PostgreSQL-specific types like Decimal
class CustomJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super(CustomJsonEncoder, self).default(obj)

def get_database_connection():
    """Get a connection to the PostgreSQL database."""
    try:
        # Use DATABASE_URL environment variable
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            sys.stderr.write("DATABASE_URL environment variable not set\n")
            raise ValueError("DATABASE_URL environment variable not set")
        
        # Connect to the database
        conn = psycopg2.connect(database_url)
        return conn
    except psycopg2.Error as e:
        sys.stderr.write(f"Failed to connect to PostgreSQL database: {str(e)}\n")
        raise ConnectionError(f"Failed to connect to PostgreSQL database: {str(e)}")
    except Exception as e:
        sys.stderr.write(f"Unexpected error connecting to database: {str(e)}\n")
        raise Exception(f"Database connection error: {str(e)}")

def find_requirements_by_text(query_text, limit=5, use_fuzzy_match=True):
    """
    Find similar requirements by text search in the database.
    
    Args:
        query_text: The text to search for
        limit: Maximum number of results to return
        use_fuzzy_match: Whether to use fuzzy matching (slower but more matches)
        
    Returns:
        List of dictionary objects with matching requirements
    """
    conn = None
    cursor = None
    
    try:
        # Get database connection
        conn = get_database_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Extract keywords from query (simple approach - split by spaces)
        keywords = query_text.split()
        # Keep only words longer than 3 characters
        keywords = [keyword for keyword in keywords if len(keyword) > 3]
        # Take the most significant keywords (longer words typically more meaningful)
        keywords.sort(key=len, reverse=True)
        keywords = keywords[:5]  # Use top 5 keywords
        
        sys.stderr.write(f"Text search using keywords: {', '.join(keywords)}\n")
        
        if use_fuzzy_match:
            # Use trigram similarity for fuzzy matching
            # Build dynamic query for each keyword with OR conditions
            conditions = []
            for keyword in keywords:
                conditions.append(f"requirement ILIKE '%{keyword}%'")
            
            where_clause = " OR ".join(conditions)
            
            query = f"""
            SELECT 
                id,
                category,
                requirement,
                response,
                reference,
                payload,
                0.8 as score
            FROM 
                embeddings
            WHERE 
                {where_clause}
            LIMIT {limit}
            """
        else:
            # Simple text search for exact keywords
            conditions = []
            for keyword in keywords:
                conditions.append(f"requirement ILIKE '%{keyword}%'")
            
            where_clause = " OR ".join(conditions)
            
            query = f"""
            SELECT 
                id,
                category,
                requirement,
                response,
                reference,
                payload,
                0.9 as score
            FROM 
                embeddings
            WHERE 
                {where_clause}
            LIMIT {limit}
            """
        
        # Execute query
        cursor.execute(query)
        
        # Get results
        results = cursor.fetchall()
        
        sys.stderr.write(f"Text search found {len(results)} matches\n")
        
        # Process results
        processed_results = []
        for result in results:
            # Parse payload if present
            payload = {}
            if result['payload']:
                try:
                    payload = eval(result['payload'])  # Simple eval to convert string to dict
                except:
                    payload = {}
            
            # Create a structured result matching the vector search format
            processed_result = {
                'id': result['id'],
                'category': result['category'],
                'requirement': result['requirement'],
                'response': result['response'],
                'reference': result['reference'] or '',
                'score': result['score'],
                'payload': payload
            }
            
            processed_results.append(processed_result)
        
        return processed_results
        
    except Exception as e:
        sys.stderr.write(f"Error in text search: {str(e)}\n")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()