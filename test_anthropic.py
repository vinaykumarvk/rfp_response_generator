"""
Simple test script to check if we can connect to Anthropic's API
"""

import os
import json
from anthropic import Anthropic

def test_anthropic_connectivity():
    """Test basic connectivity to Anthropic API"""
    try:
        client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        
        # Log the API key first few characters for debugging
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        print(f"API KEY STARTS WITH: {api_key[:8]}...")
        
        # Simple test message
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=300,
            messages=[
                {"role": "user", "content": "Hello, please provide a simple one-sentence response about wealth management software."}
            ],
            system="Respond with a single, short sentence only."
        )
        
        print("SUCCESS! Response received from Anthropic API.")
        
        # Check the response format
        print("\nResponse object structure:")
        print(f"Response type: {type(response)}")
        print(f"Has 'content' attribute: {hasattr(response, 'content')}")
        
        if hasattr(response, 'content'):
            print(f"Content type: {type(response.content)}")
            print(f"Content value: {response.content}")
            
            # Implementation of our extract_text function
            def extract_text(response):
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
            
            # Extract text using our function
            extracted_text = extract_text(response)
            print(f"\nExtracted text using our function: {extracted_text}")
        
        return True
        
    except Exception as e:
        print(f"ERROR connecting to Anthropic: {str(e)}")
        return False

if __name__ == "__main__":
    print("\n=== TESTING ANTHROPIC API CONNECTION ===\n")
    success = test_anthropic_connectivity()
    print(f"\nTest result: {'SUCCESS' if success else 'FAILURE'}")