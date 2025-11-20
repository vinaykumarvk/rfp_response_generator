#!/usr/bin/env python3
"""
Test GPT-5 with user's syntax
"""
import os
from openai import OpenAI

api_key = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

print("Testing GPT-5 with user's syntax...")
print("=" * 60)

try:
    # User's syntax
    response = client.responses.create(
        input='What is the day today?',
        model='gpt-5'
    )
    print("✅ User's syntax works!")
    print(f"Response: {response.output_text}")
except Exception as e:
    print(f"❌ User's syntax failed: {e}")
    print("\nTrying standard chat.completions syntax...")
    
    try:
        # Standard syntax
        response = client.chat.completions.create(
            model='gpt-5',
            messages=[
                {"role": "user", "content": "What is the day today?"}
            ]
        )
        print("✅ Standard syntax works!")
        print(f"Response: {response.choices[0].message.content}")
    except Exception as e2:
        print(f"❌ Standard syntax also failed: {e2}")
