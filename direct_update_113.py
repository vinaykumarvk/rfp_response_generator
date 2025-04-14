"""
Direct update of requirement 113 with Anthropic response
"""

import os
from anthropic import Anthropic
from sqlalchemy import text
from database import engine

def direct_update_113():
    """Directly update requirement 113 with Anthropic response"""
    try:
        # Generate a response with Anthropic
        print("\n=== GENERATING ANTHROPIC RESPONSE FOR AIF TRANSACTIONS ===")
        client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": """Generate a detailed response for the following RFP requirement for a wealth management platform:

Requirement: AIF Transaction Update / Nav Calculation / Absolute & XIRR Returns

Your response should focus on the platform's capabilities regarding:
1. Processing and updating Alternative Investment Fund (AIF) transactions
2. NAV calculation methodology and frequency
3. Support for both Absolute and XIRR return calculation methods
4. Any regulatory compliance features related to AIF performance reporting

Please write in a professional, comprehensive manner that would be suitable for an RFP response.
"""}
            ],
            system="You are a senior wealth management software expert. Provide detailed, accurate, and professional responses to RFP requirements."
        )
        
        # Extract text
        content = ""
        if hasattr(response, 'content'):
            if isinstance(response.content, list):
                content = ' '.join(block.text for block in response.content if hasattr(block, 'text'))
            else:
                content = str(response.content)
        
        print(f"ANTHROPIC RESPONSE: {content[:200]}...")
        print(f"Response length: {len(content)} characters")
        
        # Save to database
        print("\n=== UPDATING REQUIREMENT 113 IN DATABASE ===")
        with engine.connect() as connection:
            update_query = text("""
                UPDATE excel_requirement_responses
                SET 
                    anthropic_response = :anthropic_response,
                    final_response = :final_response,
                    model_provider = 'anthropic',
                    timestamp = NOW()
                WHERE id = 113
            """)
            
            connection.execute(update_query, {
                "anthropic_response": content,
                "final_response": content
            })
            connection.commit()
            print("Updated requirement 113 with Anthropic response")
            
            # Verify the update
            verify_query = text("""
                SELECT requirement, anthropic_response, final_response
                FROM excel_requirement_responses
                WHERE id = 113
            """)
            
            verify = connection.execute(verify_query).fetchone()
            
            if verify:
                requirement = verify[0] or "None"
                anthropic_resp = verify[1] or "None"
                final_resp = verify[2] or "None"
                print(f"Requirement: {requirement}")
                print(f"Anthropic response in DB: {anthropic_resp[:100]}...")
                print(f"Final response in DB: {final_resp[:100]}...")
                
                # Convert to JSON for easier copy-paste
                print("\n=== JSON RESPONSE FOR API ===")
                json_response = {
                    "id": 113,
                    "requirement": requirement,
                    "anthropicResponse": anthropic_resp,
                    "finalResponse": final_resp,
                    "modelProvider": "anthropic",
                    "success": True,
                    "message": "Response generated successfully"
                }
                import json
                print(json.dumps(json_response, indent=2))
            else:
                print("Failed to verify the update")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    direct_update_113()