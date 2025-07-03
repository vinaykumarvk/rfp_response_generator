import json
import logging
import sys
import time
import os
import numpy as np
from database import engine
from sqlalchemy import text
from openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(stream=sys.stdout)]
)
logger = logging.getLogger(__name__)

def find_similar_matches(requirement_id):
    """
    Find similar matches for a requirement using vector similarity search.
    This is the corrected version that properly does vector similarity search.
    
    Args:
        requirement_id: The ID of the requirement to find matches for
        
    Returns:
        Dict with requirement details and similar matches
    """
    logger.info(f"Finding similar matches for requirement ID: {requirement_id}")
    
    try:
        with engine.connect() as connection:
            # Get the requirement details
            requirement_query = text("""
                SELECT id, requirement, category 
                FROM excel_requirement_responses 
                WHERE id = :req_id
            """)
            
            requirement = connection.execute(requirement_query, {"req_id": requirement_id}).fetchone()
            
            if not requirement:
                return {
                    "success": False,
                    "error": f"Requirement with ID {requirement_id} not found"
                }

            logger.info(f"Found requirement: {requirement}")
            
            current_requirement = requirement[1]
            current_category = requirement[2]
            
            # Generate embedding for current requirement using OpenAI
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            try:
                embedding_response = client.embeddings.create(
                    input=current_requirement,
                    model="text-embedding-ada-002"
                )
                current_embedding = np.array(embedding_response.data[0].embedding)
                logger.info(f"Generated embedding for requirement: {current_requirement}")
            except Exception as e:
                logger.error(f"Failed to generate embedding: {str(e)}")
                return {"success": False, "error": f"Failed to generate embedding: {str(e)}"}
            
            # Get ALL embeddings from database for similarity comparison
            # This is the proper way - compare against all embeddings, not just exact matches
            embeddings_query = text("""
                SELECT 
                    e.id,
                    e.requirement,
                    e.response,
                    e.category,
                    e.reference,
                    e.payload,
                    e.embedding
                FROM embeddings e
                WHERE e.embedding IS NOT NULL
                ORDER BY e.id
            """)
            
            all_embeddings = connection.execute(embeddings_query).fetchall()
            logger.info(f"Retrieved {len(all_embeddings)} embeddings for similarity calculation")
            
            # Calculate cosine similarity for each embedding
            similar_matches = []
            processed_count = 0
            matches_found = 0
            
            # Pre-calculate norm for current embedding for efficiency
            norm_current = np.linalg.norm(current_embedding)
            
            for row in all_embeddings:
                processed_count += 1
                if processed_count % 1000 == 0:
                    logger.info(f"Processed {processed_count} embeddings, found {matches_found} matches so far...")
                
                try:
                    stored_embedding = np.array(row.embedding)
                    
                    # Calculate cosine similarity
                    dot_product = np.dot(current_embedding, stored_embedding)
                    norm_stored = np.linalg.norm(stored_embedding)
                    similarity = dot_product / (norm_current * norm_stored)
                    
                    # Only include if similarity >= 90%
                    if similarity >= 0.9:
                        matches_found += 1
                        
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
                            'requirement': row.requirement,
                            'response': row.response,
                            'category': row.category,
                            'reference': row.reference or f"Source {row.id}",
                            'customer': customer_name,
                            'similarity_score': similarity
                        })
                        
                except Exception as e:
                    logger.warning(f"Error processing embedding {row.id}: {str(e)}")
                    continue
            
            logger.info(f"Final results: Found {matches_found} matches with 90%+ similarity from {processed_count} embeddings")
            
            # Sort by similarity score (highest first)
            similar_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            # Limit to top 10 matches
            similar_matches = similar_matches[:10]
            
            # Format results for return and database storage
            formatted_results = []
            similar_questions_for_db = []
            
            for result in similar_matches:
                # Format for API response
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
                    "reference": result['reference'],
                    "customer": result['customer'],
                    "similarity_score": f"{float(result['similarity_score']):.4f}"
                })
            
            # Store the similar questions in the database
            if similar_questions_for_db:
                similar_questions_json = json.dumps(similar_questions_for_db)
                
                update_query = text("""
                    UPDATE excel_requirement_responses
                    SET similar_questions = :similar_questions
                    WHERE id = :req_id
                """)
                
                connection.execute(update_query, {
                    "req_id": requirement_id,
                    "similar_questions": similar_questions_json
                })
                
                connection.commit()
                logger.info(f"Updated similar_questions in database for requirement ID: {requirement_id}")
            
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