import json
import logging
import sys
import time
import os
import numpy as np
from database import engine
from sqlalchemy import text
from openai import OpenAI

# Configure more detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(stream=sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def find_similar_matches(requirement_id):
    """
    Find similar matches for a requirement using vector similarity search.
    Also stores the similar matches in the similar_questions column of excel_requirement_responses.
    
    Args:
        requirement_id: The ID of the requirement to find matches for
        
    Returns:
        Dict with requirement details and similar matches
    """
    logger.info(f"Finding similar matches for requirement ID: {requirement_id}")
    try:
        with engine.connect() as connection:
            # First, get the requirement details
            req_query = text("""
                SELECT r.id, r.requirement, r.category
                FROM excel_requirement_responses r
                WHERE r.id = :req_id
            """)

            # Get the requirement details
            requirement = connection.execute(req_query, {"req_id": requirement_id}).fetchone()

            if not requirement:
                print(f"\nNo requirement found with ID: {requirement_id}")
                return {
                    "success": False,
                    "error": f"No requirement found with ID: {requirement_id}"
                }

            # Log the requirement we're looking for
            logger.info(f"Found requirement: {requirement}")
            
            # First check if an embedding exists for this requirement
            embedding_check_query = text("""
                SELECT COUNT(*) 
                FROM embeddings 
                WHERE requirement = (
                    SELECT requirement 
                    FROM excel_requirement_responses 
                    WHERE id = :req_id
                )
            """)
            
            embedding_count = connection.execute(embedding_check_query, {"req_id": requirement_id}).scalar()
            logger.info(f"Found {embedding_count} embeddings for requirement ID {requirement_id}")
            
            if embedding_count == 0:
                logger.warning(f"No embeddings found for requirement ID {requirement_id}")
                # Return early with fallback similar questions
                return {
                    "success": True,
                    "requirement": {
                        "id": requirement[0],
                        "text": requirement[1],
                        "category": requirement[2]
                    },
                    "similar_matches": [],
                    "warning": "No embeddings found for this requirement"
                }
            
            # Create an embedding for the current requirement to search against
            # First get the requirement text
            req_text_query = text("""
                SELECT requirement, category
                FROM excel_requirement_responses
                WHERE id = :req_id
            """)
            req_result = connection.execute(req_text_query, {"req_id": requirement_id}).fetchone()
            
            if not req_result:
                logger.error(f"No requirement found with ID {requirement_id}")
                return {"success": False, "error": f"Requirement {requirement_id} not found"}
            
            current_requirement, current_category = req_result
            logger.info(f"Searching for similar requirements to: {current_requirement}")
            
            # Get all embeddings and calculate similarity using OpenAI embeddings
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            # Generate embedding for current requirement
            start_time = time.time()
            try:
                embedding_response = client.embeddings.create(
                    input=current_requirement,
                    model="text-embedding-ada-002"
                )
                current_embedding = np.array(embedding_response.data[0].embedding)
            except Exception as e:
                logger.error(f"Failed to generate embedding: {str(e)}")
                return {"success": False, "error": f"Failed to generate embedding: {str(e)}"}
            
            # Find similar embeddings using cosine similarity
            similar_query = text("""
                SELECT 
                    e.id,
                    e.requirement as matched_requirement,
                    e.response as matched_response,
                    e.category,
                    e.reference,
                    e.payload,
                    e.embedding
                FROM embeddings e
                WHERE e.embedding IS NOT NULL
                ORDER BY e.id
            """)
            
            # Get all embeddings
            all_embeddings = connection.execute(similar_query).fetchall()
            logger.info(f"Retrieved {len(all_embeddings)} embeddings for similarity calculation")
            
            # Calculate cosine similarity for each embedding
            similar_matches = []
            for row in all_embeddings:
                try:
                    stored_embedding = np.array(row.embedding)
                    
                    # Calculate cosine similarity
                    dot_product = np.dot(current_embedding, stored_embedding)
                    norm_current = np.linalg.norm(current_embedding)
                    norm_stored = np.linalg.norm(stored_embedding)
                    similarity = dot_product / (norm_current * norm_stored)
                    
                    # Only include if similarity >= 90%
                    if similarity >= 0.9:
                        # Extract customer name from payload if available
                        customer_name = ""
                        try:
                            if row.payload:
                                payload_data = json.loads(row.payload)
                                customer_name = payload_data.get('customer', '')
                        except:
                            pass
                        
                        similar_matches.append({
                            'id': row.id,
                            'requirement': row.matched_requirement,
                            'response': row.matched_response,
                            'category': row.category,
                            'reference': row.reference or '',
                            'customer': customer_name,
                            'similarity_score': float(similarity)
                        })
                except Exception as e:
                    logger.warning(f"Error calculating similarity for embedding {row.id}: {str(e)}")
                    continue
            
            # Sort by similarity score (highest first) and limit to top 5
            similar_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
            similar_matches = similar_matches[:5]
            
            elapsed_time = time.time() - start_time
            logger.info(f"Similarity search completed in {elapsed_time:.2f} seconds")
            logger.info(f"Found {len(similar_matches)} matches with 90%+ similarity")
            
            # Format results for return and database storage
            formatted_results = []
            similar_questions_for_db = []
            
            for result in similar_matches:
                
                # Format for API response (result is now a dictionary)
                formatted_results.append({
                    "id": result['id'],
                    "requirement": result['requirement'],
                    "response": result['response'],
                    "category": result['category'],
                    "reference": result['reference'],
                    "customer": result['customer'],
                    "similarity_score": float(result['similarity_score'])
                })
                
                # Format for database storage
                similar_questions_for_db.append({
                    "question": result['requirement'],
                    "response": result['response'],
                    "reference": result['reference'] or f"Match #{result['id']}",
                    "customer": result['customer'],
                    "similarity_score": f"{float(result['similarity_score']):.4f}"
                })
            
            # Store the similar questions in the database
            if similar_questions_for_db:
                # Convert to JSON string for storage
                similar_questions_json = json.dumps(similar_questions_for_db)
                
                # Update the similar_questions column in the database
                update_query = text("""
                    UPDATE excel_requirement_responses
                    SET similar_questions = :similar_questions
                    WHERE id = :req_id
                """)
                
                connection.execute(update_query, {
                    "req_id": requirement_id,
                    "similar_questions": similar_questions_json
                })
                
                # Commit the transaction
                connection.commit()
                logger.info(f"Updated similar_questions in database for requirement ID: {requirement_id}")
            
            # For debug/console output in logs only
            logger.info(f"Original Requirement: ID={requirement_id}, Category={current_category}")
            logger.info(f"Requirement text: {current_requirement}")
            logger.info(f"Found {len(similar_matches)} similar matches with 90%+ similarity")
            
            # Log the results for debugging but don't print to stdout
            for idx, result in enumerate(similar_matches, 1):
                logger.info(f"Match #{idx}")
                logger.info(f"ID: {result['id']}")
                logger.info(f"Category: {result['category']}")
                logger.info(f"Similarity Score: {result['similarity_score']:.4f}")
                logger.info(f"Customer: {result['customer'] or 'Not specified'}")
                logger.info(f"Requirement: {result['requirement'][:50]}...")
                logger.info(f"Response: {result['response'][:100]}...") # Log only the first 100 chars
                logger.info("-" * 40)
            
            # Return structured data
            return {
                "success": True,
                "requirement": {
                    "id": requirement_id,
                    "text": current_requirement,
                    "category": current_category
                },
                "similar_matches": formatted_results
            }
    except Exception as e:
        logger.error(f"Error finding similar matches: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import sys
    
    # Get requirement ID from command line if provided, otherwise use 1 as default
    requirement_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    # Run the function with the provided ID
    results = find_similar_matches(requirement_id)
    print(json.dumps(results, indent=2))