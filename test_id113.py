"""
Direct test of Claude/Anthropic API for requirement ID 113
"""

import os
import sys
import json
import logging
from sqlalchemy import text, create_engine
from anthropic import Anthropic
from database import engine

# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import necessary functions
from generate_prompt import create_rfp_prompt, convert_prompt_to_claude

def extract_text(response):
    """
    Extract clean text from Claude's TextBlock response.

    Args:
        response: Response object from Claude API

    Returns:
        str: Clean text without TextBlock wrapper
    """
    # Handle direct string
    if isinstance(response, str):
        return response
        
    # Handle content attribute (new Anthropic API)
    if hasattr(response, 'content'):
        if isinstance(response.content, list):
            # Handle TextBlock objects
            return ' '.join(block.text for block in response.content if hasattr(block, 'text'))
        elif isinstance(response.content, str):
            return response.content
        else:
            # Try as string anyway
            return str(response.content)
            
    # Handle direct TextBlock object
    if hasattr(response, 'text'):
        return response.text
        
    # Last resort fallback
    return str(response)

def test_claude_direct(requirement_id: int):
    """Direct test of Claude API for a specific requirement"""
    try:
        print(f"\n===== TESTING CLAUDE DIRECT FOR REQUIREMENT ID {requirement_id} =====")
        
        # First, get the requirement details
        with engine.connect() as connection:
            # Get requirement details
            req_query = text("""
                SELECT r.id, r.requirement, r.category
                FROM excel_requirement_responses r
                WHERE r.id = :req_id
            """)
            requirement = connection.execute(req_query, {"req_id": requirement_id}).fetchone()

            if not requirement:
                print(f"No requirement found with ID: {requirement_id}")
                return
            
            print(f"Found requirement: {requirement[1]}")
            print(f"Category: {requirement[2]}")
            
            # Find similar matches
            similar_query = text("""
                WITH requirement_embedding AS (
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
                    CASE 
                        WHEN re.embedding IS NOT NULL AND e.embedding IS NOT NULL 
                        THEN 1 - (e.embedding <=> re.embedding)
                        ELSE 0.0
                    END as similarity_score
                FROM embeddings e
                CROSS JOIN requirement_embedding re
                WHERE e.embedding IS NOT NULL
                ORDER BY similarity_score DESC
                LIMIT 5;
            """)
            
            try:
                similar_results = connection.execute(similar_query, {"req_id": requirement_id}).fetchall()
                print(f"Found {len(similar_results)} similar questions")
                
                # Format previous responses
                previous_responses = []
                for idx, result in enumerate(similar_results, 1):
                    previous_responses.append({
                        "requirement": result[1],  # matched_requirement
                        "response": result[2],     # matched_response
                        "similarity_score": result[4]  # similarity_score as float
                    })
                    print(f"Similar Q {idx}: {result[1][:50]}... (score: {result[4]:.4f})")
                
                # Generate Claude-specific prompt
                print("\n=== GENERATING CLAUDE PROMPT ===")
                base_prompt = create_rfp_prompt(requirement[1], requirement[2], previous_responses)
                claude_prompt = convert_prompt_to_claude(base_prompt)
                
                # Print the actual prompt
                print("\n=== CLAUDE PROMPT ===")
                for msg in claude_prompt:
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    print(f"ROLE: {role}")
                    print(f"CONTENT: {content[:200]}...")
                print("======================")
                
                # Call Claude API
                print("\n=== CALLING CLAUDE API ===")
                client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
                
                # Extract system message
                system_message = "All responses and data must be treated as private and confidential."
                for msg in claude_prompt:
                    if msg.get('role') == 'system':
                        system_message = msg.get('content', system_message)
                        break
                
                # Filter out system messages
                messages = [msg for msg in claude_prompt if msg.get('role') != 'system']
                
                print(f"System: {system_message[:100]}...")
                print(f"Messages: {len(messages)} messages")
                
                # Make the API call
                response = client.messages.create(
                    model="claude-3-7-sonnet-20250219",
                    max_tokens=4000,
                    temperature=0.2,
                    messages=messages,
                    system=system_message
                )
                
                # Extract and display the response
                print("\n=== CLAUDE RESPONSE RAW ===")
                print(f"Response type: {type(response)}")
                print(f"Has 'content' attribute: {hasattr(response, 'content')}")
                if hasattr(response, 'content'):
                    print(f"Content type: {type(response.content)}")
                    print(f"Content: {response.content}")
                
                # Extract the text
                extracted_content = extract_text(response)
                print("\n=== EXTRACTED CLAUDE RESPONSE ===")
                print(extracted_content)
                print("================================")
                
                # Save the response to the database
                if extracted_content:
                    print("\n=== SAVING RESPONSE TO DATABASE ===")
                    save_query = text("""
                        UPDATE excel_requirement_responses
                        SET 
                            anthropic_response = :anthropic_response,
                            final_response = :final_response,
                            model_provider = 'anthropic',
                            timestamp = NOW()
                        WHERE id = :req_id
                    """)
                    
                    connection.execute(save_query, {
                        "req_id": requirement_id,
                        "anthropic_response": extracted_content,
                        "final_response": extracted_content
                    })
                    connection.commit()
                    print("Response saved to database")
                    
                    # Verify it was saved
                    verify_query = text("""
                        SELECT anthropic_response, final_response
                        FROM excel_requirement_responses
                        WHERE id = :req_id
                    """)
                    verify_result = connection.execute(verify_query, {"req_id": requirement_id}).fetchone()
                    
                    if verify_result:
                        saved_anthropic = verify_result[0] or "None"
                        saved_final = verify_result[1] or "None"
                        print(f"\nVERIFICATION - Anthropic response in DB: {saved_anthropic[:100]}...")
                        print(f"VERIFICATION - Final response in DB: {saved_final[:100]}...")
                    else:
                        print("Failed to verify saved response")
                
            except Exception as e:
                print(f"Error processing similar questions: {str(e)}")
        
    except Exception as e:
        print(f"Error in test_claude_direct: {str(e)}")

if __name__ == "__main__":
    # Get requirement ID from command line argument
    requirement_id = int(sys.argv[1]) if len(sys.argv) > 1 else 113
    test_claude_direct(requirement_id)