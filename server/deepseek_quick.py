#!/usr/bin/env python3
"""
Very simple test for DeepSeek API
"""

import openai
import time

# API key
api_key = "sk-831e97c2650c43c9b1336c48595e0941"  # Working key

# Create client
client = openai.OpenAI(
    api_key=api_key,
    base_url="https://api.deepseek.com/v1",
    timeout=15.0  # Short 15 second timeout
)

# Simple prompt
messages = [
    {"role": "user", "content": "What are 3 key document features for wealth management?"}
]

print("Sending simple request to DeepSeek API...")
start = time.time()

try:
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        temperature=0.5,
        max_tokens=150
    )
    
    elapsed = time.time() - start
    print(f"Response time: {elapsed:.2f} seconds")
    print("\nDeepSeek response:")
    print("="*50)
    print(response.choices[0].message.content)
    print("="*50)
except Exception as e:
    print(f"Error: {str(e)}")