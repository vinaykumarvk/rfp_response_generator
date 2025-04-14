from database import engine
from sqlalchemy import text

def find_similar_matches(requirement_id):
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
            return

        print("\nOriginal Requirement:")
        print(f"ID: {requirement[0]}")
        print(f"Category: {requirement[2]}")
        print(f"Text: {requirement[1]}")
        print("\nTop 5 Similar Matches:")

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

        # Print the results
        for idx, result in enumerate(similar_results, 1):
            print(f"\nMatch #{idx}")
            print(f"ID: {result[0]}")
            print(f"Category: {result[3]}")
            print(f"Similarity Score: {result[4]:.4f}")
            print(f"Requirement: {result[1]}")
            print(f"Response: {result[2]}")
            print("-" * 80)

if __name__ == "__main__":
    # Use requirement ID 1 as an example
    find_similar_matches(1) 