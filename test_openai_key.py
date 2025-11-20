#!/usr/bin/env python3
"""
Test script to verify OpenAI API key and model access
"""
import os
import sys
from openai import OpenAI

def test_model(model_name):
    """Test a specific model"""
    print(f"\nTesting {model_name}...")
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found")
        return False
    
    try:
        client = OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Say 'Hello, I am working!' in 5 words or less."}
            ],
            temperature=0.2,
            max_tokens=50
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✅ {model_name} Response: {result}")
        print(f"   Model: {response.model}")
        print(f"   Tokens: {response.usage.total_tokens}")
        return True
        
    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg or "model" in error_msg.lower():
            print(f"❌ {model_name} - Model not available/found")
        elif "401" in error_msg or "authentication" in error_msg.lower():
            print(f"❌ Authentication failed - Invalid API key")
        else:
            print(f"❌ {model_name} Error: {error_msg}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("OpenAI API Key & Model Access Test")
    print("=" * 60)
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        print(f"API Key: {api_key[:15]}...{api_key[-4:]}")
    else:
        print("No API key found!")
        sys.exit(1)
    
    # Test different models
    models_to_test = [
        "gpt-4o-mini",  # Most basic/available model
        "gpt-4o",       # Standard GPT-4
        "gpt-4",        # Legacy GPT-4
        "gpt-5"         # New GPT-5
    ]
    
    results = {}
    for model in models_to_test:
        results[model] = test_model(model)
    
    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)
    for model, success in results.items():
        status = "✅ Working" if success else "❌ Failed"
        print(f"{model:20s}: {status}")
