#!/usr/bin/env python3
"""
Test script to verify GPT-5 integration
"""
import os
import sys
from openai import OpenAI

def test_gpt5():
    """Test GPT-5 API call"""
    print("Testing GPT-5 integration...")
    print("=" * 50)
    
    # Check if API key is available
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found in environment")
        return False
    
    print(f"✓ API Key found (starts with: {api_key[:10]}...)")
    
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        print("✓ OpenAI client initialized")
        
        # Make a test call to GPT-5
        print("\nMaking test call to GPT-5...")
        response = client.chat.completions.create(
            model='gpt-5',
            messages=[
                {
                    "role": "user", 
                    "content": "Say 'GPT-5 is working!' and tell me what model you are."
                }
            ],
            temperature=0.2,
            max_tokens=100
        )
        
        # Extract the response
        result = response.choices[0].message.content.strip()
        
        print("\n" + "=" * 50)
        print("GPT-5 Response:")
        print("=" * 50)
        print(result)
        print("=" * 50)
        
        # Verify model information
        print(f"\n✓ Model used: {response.model}")
        print(f"✓ Finish reason: {response.choices[0].finish_reason}")
        print(f"✓ Tokens used: {response.usage.total_tokens}")
        
        print("\n✅ GPT-5 is working correctly!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing GPT-5: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_gpt5()
    sys.exit(0 if success else 1)
