import os
import json
import logging
from database import engine
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def find_similar_matches(requirement_id):
    """
    Find similar matches for a given requirement ID.
    This is a simplified version that uses database queries without embeddings.
    
    Args:
        requirement_id: The ID of the requirement to find matches for
        
    Returns:
        Dictionary containing the requirement and similar matches
    """
    try:
        logger.info(f"Finding similar matches for requirement ID: {requirement_id}")
        
        with engine.connect() as connection:
            # First, get the requirement details from the database
            req_query = text("""
                SELECT id, requirement, category, rfp_name
                FROM excel_requirement_responses
                WHERE id = :req_id
            """)
            
            requirement = connection.execute(req_query, {"req_id": requirement_id}).fetchone()
            
            if not requirement:
                logger.error(f"No requirement found with ID: {requirement_id}")
                return {
                    "success": False,
                    "error": f"No requirement found with ID: {requirement_id}"
                }
            
            logger.info(f"Found requirement: {requirement}")
            requirement_text = requirement[1]
            category = requirement[2]
            rfp_name = requirement[3]
            
            # Get other requirements with similar categories
            similar_query = text("""
                SELECT id, requirement, category, rfp_name
                FROM excel_requirement_responses
                WHERE id != :req_id
                AND (
                    category = :category
                    OR requirement ILIKE :search_term
                )
                LIMIT 5
            """)
            
            # Execute the query with the search term
            search_term = f"%{requirement_text[:20]}%"
            similar_results = connection.execute(similar_query, {
                "req_id": requirement_id,
                "category": category,
                "search_term": search_term
            }).fetchall()
            
            # Format results and build similar questions data
            formatted_results = []
            similar_questions_for_db = []
            
            for result in similar_results:
                result_id = result[0]
                result_req = result[1]
                result_cat = result[2]
                
                # Generate a simulated response
                simulated_response = f"The {result_cat} functionality in our system provides comprehensive capabilities that address the requirement: {result_req[:50]}..."
                
                # Calculate a simple similarity score (simulating vector similarity)
                # In a real-world scenario, this would use actual embeddings
                if result_cat == category:
                    similarity_score = 0.85  # Same category = high similarity
                else:
                    similarity_score = 0.65  # Different category but matched on text
                
                # Format for API response
                formatted_results.append({
                    "id": result_id,
                    "requirement": result_req,
                    "response": simulated_response,
                    "category": result_cat,
                    "similarity_score": similarity_score
                })
                
                # Format for database storage
                similar_questions_for_db.append({
                    "question": result_req,
                    "response": simulated_response,
                    "reference": f"Match #{result_id}",
                    "similarity_score": f"{similarity_score:.4f}"
                })
        
        # Print the results
        for idx, match in enumerate(similar_matches, 1):
            print(f"\nMatch #{idx}")
            print(f"ID: {match['id']}")
            print(f"Category: {match['category']}")
            print(f"Similarity Score: {match['similarity_score']:.4f}")
            print(f"Requirement: {match['requirement']}")
            print(f"Response: {match['response']}")
            print("-" * 80)
        
        # Return structured data
        return {
            "id": requirement_id,
            "requirement": requirement_text,
            "category": category,
            "similar_matches": similar_matches
        }
        
    except Exception as e:
        logger.error(f"Error finding similar matches: {str(e)}")
        return {
            "id": requirement_id,
            "error": f"Error finding similar matches: {str(e)}",
            "similar_matches": []
        }

if __name__ == "__main__":
    # Test with requirement ID 1
    results = find_similar_matches(1)
    print(json.dumps(results, indent=2))