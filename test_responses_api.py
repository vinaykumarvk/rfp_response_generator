#!/usr/bin/env python3
"""
Test the new OpenAI Responses API with GPT-5
"""
import os
from openai import OpenAI

def test_responses_api():
    """Test GPT-5 with the new Responses API"""
    print("Testing GPT-5 with Responses API...")
    print("=" * 60)
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ No API key found")
        return False
    
    print(f"API Key: {api_key[:15]}...{api_key[-4:]}")
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Test with the new Responses API
        response = client.responses.create(
            model='gpt-5',
            input='Say "GPT-5 is working!" and tell me what model you are in 15 words or less.',
            temperature=0.2
        )
        
        # Get the output text
        result = response.output_text
        
        print("\n" + "=" * 60)
        print("✅ GPT-5 Response (Responses API):")
        print("=" * 60)
        print(result)
        print("=" * 60)
        
        return True
        
    except Exception as e:
        error_msg = str(e)
        print(f"\n❌ Error: {error_msg}")
        
        if "401" in error_msg or "authentication" in error_msg.lower():
            print("\n⚠️  Authentication failed")
            print("   The API key may need to be refreshed in the environment.")
            print("   Please restart the entire Repl to reload secrets.")
        elif "404" in error_msg:
            print("\n⚠️  Model not found - GPT-5 may not be available with this key/account")
        
        return False

if __name__ == "__main__":
    test_responses_api()
