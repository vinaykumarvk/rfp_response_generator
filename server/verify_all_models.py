#!/usr/bin/env python3
"""
Simple verification script for all three models (OpenAI, Anthropic, DeepSeek)
Tests each model individually with a simple prompt
"""

import sys
from rfp_response_generator_pg import prompt_gpt

def verify_models():
    """Verify each model works with a simple prompt"""
    print("\n=== VERIFYING ALL MODELS WITH HARDCODED API KEYS ===\n")
    
    # Simple test prompt that works with all models
    test_prompt = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say hello in one short sentence."}
    ]
    
    models = ["openAI", "anthropic", "deepseek"]
    
    for model in models:
        print(f"Testing {model}...")
        try:
            response = prompt_gpt(test_prompt, llm=model)
            success = not response.startswith("Error")
            
            if success:
                print(f"✅ SUCCESS: {response}\n")
            else:
                print(f"❌ FAILED: {response}\n")
                
        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)}\n")
    
if __name__ == "__main__":
    verify_models()