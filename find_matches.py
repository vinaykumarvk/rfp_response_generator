import json
import logging
import sys
import time
from database import engine
from sqlalchemy import text

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
            
            # Generate embedding on-the-fly for this requirement (don't persist it)
            # This keeps the embeddings table pristine with only 9,650 reference embeddings
            requirement_text = requirement[1]
            logger.info(f"Generating temporary embedding for requirement: {requirement_text[:100]}...")
            
            try:
                from openai import OpenAI
                import os
                
                client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
                embedding_response = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=requirement_text
                )
                requirement_embedding = embedding_response.data[0].embedding
                logger.info(f"Generated temporary embedding (dimension: {len(requirement_embedding)})")
                
            except Exception as e:
                logger.error(f"Error generating temporary embedding: {str(e)}")
                return {
                    "success": False,
                    "error": f"Failed to generate embedding: {str(e)}"
                }
            
            # Now find similar matches using the temporary embedding
            # Search against the 9,650 reference embeddings ONLY
            # Convert the embedding list to the format PostgreSQL expects
            embedding_str = '[' + ','.join(map(str, requirement_embedding)) + ']'
            
            # We need to use a subquery with the embedding directly in the SQL
            # since SQLAlchemy has issues with vector type parameter binding
            similar_query = text(f"""
                SELECT 
                    e.id,
                    e.requirement as matched_requirement,
                    e.response as matched_response,
                    e.category,
                    e.reference,
                    e.payload,
                    1 - (e.embedding <=> '{embedding_str}'::vector) as similarity_score
                FROM embeddings e
                WHERE e.embedding IS NOT NULL
                ORDER BY similarity_score DESC
                LIMIT 5;
            """)

            # Log that we're starting the similarity search
            logger.info(f"Starting similarity search query for requirement ID: {requirement_id}")
            start_time = time.time()
            
            # Execute the similarity search with the temporary embedding
            # Using try/except to catch potential timeout issues
            try:
                similar_results = connection.execution_options(timeout=20).execute(
                    similar_query
                ).fetchall()
                
                elapsed_time = time.time() - start_time
                logger.info(f"Similarity search completed in {elapsed_time:.2f} seconds")
            except Exception as query_error:
                elapsed_time = time.time() - start_time
                logger.error(f"Similarity search failed after {elapsed_time:.2f} seconds: {str(query_error)}")
                raise
            
            # Format results for return and database storage
            formatted_results = []
            similar_questions_for_db = []
            
            for result in similar_results:
                # Extract fields from the database result
                reference_field = result[4] if result[4] else ""  # Document name (e.g., "BDO RFI.xlsx_Sheet1")
                category_field = result[3] if result[3] else ""   # Category/customer info
                
                # Document name is in the reference column - this is what we want to display
                document_name = reference_field if reference_field else ""
                
                # Customer/category info from category field
                customer_info = category_field if category_field else ""
                
                # Last resort: try payload for customer info
                if not customer_info:
                    try:
                        if result[5]:  # payload field
                            payload = json.loads(result[5])
                            if payload.get('category'):
                                customer_info = payload['category']
                    except Exception as e:
                        logger.debug(f"Could not parse payload for customer info: {e}")
                
                # Format for API response
                formatted_results.append({
                    "id": result[0],
                    "requirement": result[1],
                    "response": result[2],
                    "category": customer_info,  # Category field for display
                    "reference": document_name,  # Document name from reference column
                    "customer": customer_info,   # Customer info for backwards compatibility
                    "similarity_score": float(result[6])  # Updated index for similarity_score
                })
                
                # Format for database storage
                similar_questions_for_db.append({
                    "question": result[1],
                    "response": result[2],
                    "reference": f"Match #{result[0]}",
                    "customer": customer_info,
                    "similarity_score": f"{float(result[6]):.4f}"  # Updated index
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
                logger.info(f"Similarity Score: {float(result[6]):.4f}")
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