import json
from database import engine
from sqlalchemy import text

def find_similar_matches(requirement_id):
    """
    Find similar matches for a requirement using vector similarity search.
    Also stores the similar matches in the similar_questions column of excel_requirement_responses.
    
    Args:
        requirement_id: The ID of the requirement to find matches for
        
    Returns:
        Dict with requirement details and similar matches
    """
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

            # Find top 5 similar vectors using cosine similarity
            similar_query = text("""
                SELECT 
                    e.id,
                    e.requirement as matched_requirement,
                    e.response as matched_response,
                    e.category,
                    1 - (e.embedding <=> (
                        SELECT embedding 
                        FROM embeddings 
                        WHERE requirement = (
                            SELECT requirement 
                            FROM excel_requirement_responses 
                            WHERE id = :req_id
                        )
                        LIMIT 1
                    )) as similarity_score
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
                print(f"\nUpdated similar_questions in database for requirement ID: {requirement_id}")
            
            # For debug/console output
            print("\nOriginal Requirement:")
            print(f"ID: {requirement[0]}")
            print(f"Category: {requirement[2]}")
            print(f"Text: {requirement[1]}")
            print("\nTop 5 Similar Matches:")
            
            # Print the results for debug output
            for idx, result in enumerate(similar_results, 1):
                print(f"\nMatch #{idx}")
                print(f"ID: {result[0]}")
                print(f"Category: {result[3]}")
                print(f"Similarity Score: {result[4]:.4f}")
                print(f"Requirement: {result[1]}")
                print(f"Response: {result[2]}")
                print("-" * 80)
            
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
        print(f"Error finding similar matches: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # Use requirement ID 1 as an example
    results = find_similar_matches(1)
    print(json.dumps(results, indent=2))