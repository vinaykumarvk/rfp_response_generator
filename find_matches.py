import json
import logging
from database import engine
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
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
            
            # Find top 5 similar vectors using cosine similarity with a more efficient query
            # Using Common Table Expression (CTE) to avoid nested subqueries
            similar_query = text("""
                WITH req_embedding AS (
                    SELECT embedding
                    FROM embeddings
                    WHERE requirement = (
                        SELECT requirement
                        FROM excel_requirement_responses
                        WHERE id = :req_id
                    )
                    LIMIT 1
                )
                SELECT 
                    e.id,
                    e.requirement as matched_requirement,
                    e.response as matched_response,
                    e.category,
                    1 - (e.embedding <=> (SELECT embedding FROM req_embedding)) as similarity_score
                FROM embeddings e
                WHERE e.embedding IS NOT NULL
                ORDER BY similarity_score DESC
                LIMIT 5;
            """)

            # Execute the similarity search
            similar_results = connection.execute(similar_query, {"req_id": requirement_id}).fetchall()
            
            # Format results for return and database storage
            formatted_results = []
            similar_questions_for_db = []
            
            for result in similar_results:
                # Format for API response
                formatted_results.append({
                    "id": result[0],
                    "requirement": result[1],
                    "response": result[2],
                    "category": result[3],
                    "similarity_score": float(result[4])
                })
                
                # Format for database storage
                similar_questions_for_db.append({
                    "question": result[1],
                    "response": result[2],
                    "reference": f"Match #{result[0]}",
                    "similarity_score": f"{float(result[4]):.4f}"
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
            logger.info(f"Original Requirement: ID={requirement[0]}, Category={requirement[2]}")
            logger.info(f"Requirement text: {requirement[1]}")
            logger.info(f"Found {len(similar_results)} similar matches")
            
            # Log the results for debugging but don't print to stdout
            for idx, result in enumerate(similar_results, 1):
                logger.info(f"Match #{idx}")
                logger.info(f"ID: {result[0]}")
                logger.info(f"Category: {result[3]}")
                logger.info(f"Similarity Score: {result[4]:.4f}")
                logger.info(f"Requirement: {result[1]}")
                logger.info(f"Response: {result[2][:100]}...") # Log only the first 100 chars
                logger.info("-" * 40)
            
            # Return structured data
            return {
                "success": True,
                "requirement": {
                    "id": requirement[0],
                    "text": requirement[1],
                    "category": requirement[2]
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