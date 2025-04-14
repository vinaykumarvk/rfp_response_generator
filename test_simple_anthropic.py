"""
Simple test for Anthropic API and database integration
"""

import os
import json
from anthropic import Anthropic
from sqlalchemy import text
from database import engine

def test_anthropic_and_db():
    """Test Anthropic API and database connection"""
    try:
        # 1. Test Anthropic API connection
        print("\n=== TESTING ANTHROPIC API CONNECTION ===")
        client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        
        # Simple test message
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=300,
            messages=[
                {"role": "user", "content": "Write a brief 3-sentence response about AIF Transaction Updates for a financial product."}
            ],
            system="Respond professionally and briefly."
        )
        
        # Extract text
        content = ""
        if hasattr(response, 'content'):
            if isinstance(response.content, list):
                content = ' '.join(block.text for block in response.content if hasattr(block, 'text'))
            else:
                content = str(response.content)
        
        print(f"ANTHROPIC RESPONSE: {content}")
        
        # 2. Test database connection
        print("\n=== TESTING DATABASE CONNECTION ===")
        
        # First, try to get a sample requirement
        with engine.connect() as connection:
            # Get a sample requirement
            req_query = text("""
                SELECT id, requirement, category 
                FROM excel_requirement_responses 
                LIMIT 1
            """)
            sample = connection.execute(req_query).fetchone()
            
            if sample:
                print(f"Found sample: ID={sample[0]}, Requirement={sample[1][:50]}...")
                
                # Try updating the database with the Anthropic response
                requirement_id = sample[0]
                
                update_query = text("""
                    UPDATE excel_requirement_responses
                    SET 
                        anthropic_response = :anthropic_response,
                        final_response = :final_response,
                        model_provider = 'anthropic',
                        timestamp = NOW()
                    WHERE id = :req_id
                """)
                
                connection.execute(update_query, {
                    "req_id": requirement_id,
                    "anthropic_response": content,
                    "final_response": content
                })
                connection.commit()
                print(f"Updated database with Anthropic response for ID {requirement_id}")
                
                # Verify the update
                verify_query = text("""
                    SELECT anthropic_response, final_response
                    FROM excel_requirement_responses
                    WHERE id = :req_id
                """)
                
                verify = connection.execute(verify_query, {"req_id": requirement_id}).fetchone()
                
                if verify:
                    anthropic_resp = verify[0] or "None"
                    final_resp = verify[1] or "None"
                    print(f"Verified anthropic_response in DB: {anthropic_resp[:50]}...")
                    print(f"Verified final_response in DB: {final_resp[:50]}...")
                else:
                    print("Failed to verify the update")
            else:
                print("No requirements found in database")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_anthropic_and_db()