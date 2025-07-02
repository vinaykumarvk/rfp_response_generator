#!/usr/bin/env python3
"""
Test script to verify OpenAI API connection and key validity
"""
import os
import sys
from openai import OpenAI

def test_openai_connection():
    """Test if OpenAI API is working with current key"""
    
    # Get API key from environment
    api_key = os.environ.get('OPENAI_API_KEY')
    
    if not api_key:
        print("ERROR: OPENAI_API_KEY environment variable not found")
        return False
    
    print(f"Testing OpenAI API connection...")
    print(f"API Key found: Yes (starts with {api_key[:10]}...)")
    
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Test with a simple completion
        print("Sending test request to OpenAI...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'OpenAI connection test successful' if you can read this."}
            ],
            max_tokens=50,
            temperature=0
        )
        
        # Extract response text
        response_text = response.choices[0].message.content.strip()
        print(f"OpenAI Response: {response_text}")
        
        if "successful" in response_text.lower():
            print("✅ OpenAI API connection is working correctly!")
            return True
        else:
            print("⚠️ OpenAI responded but with unexpected content")
            return False
            
    except Exception as e:
        print(f"❌ OpenAI API connection failed: {str(e)}")
        
        # Check for specific error types
        if "api_key" in str(e).lower() or "authentication" in str(e).lower():
            print("   → This appears to be an API key authentication issue")
        elif "quota" in str(e).lower():
            print("   → This appears to be a quota/billing issue")
        elif "rate" in str(e).lower():
            print("   → This appears to be a rate limiting issue")
        else:
            print("   → This appears to be a general API issue")
            
        return False

if __name__ == "__main__":
    success = test_openai_connection()
    sys.exit(0 if success else 1)