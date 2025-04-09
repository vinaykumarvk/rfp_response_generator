#!/usr/bin/env python3
"""
Direct API testing script for command-line use.
This script allows for direct testing of OpenAI and Anthropic APIs.
"""

import os
import sys
import json
import time

def test_openai():
    """Test OpenAI API connectivity"""
    try:
        # Import the OpenAI module
        from openai import OpenAI
        
        # Check if API key is available
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            print(json.dumps({
                "success": False,
                "error": "OPENAI_API_KEY environment variable not found"
            }))
            return
            
        # Start timing
        start_time = time.time()
        
        # Initialize client
        client = OpenAI(api_key=api_key)
        
        # Make a simple API call
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Please respond with 'OpenAI connection successful' and nothing else."}
            ],
            max_tokens=50
        )
        
        # End timing
        end_time = time.time()
        response_time_ms = int((end_time - start_time) * 1000)
        
        # Print the result
        print("OpenAI API Test Result:")
        print(f"Status: SUCCESS")
        print(f"Response: {response.choices[0].message.content}")
        print(f"Response time: {response_time_ms}ms")
        
    except ImportError as e:
        print(f"Error: ImportError: {str(e)}. Please install the openai package with 'pip install openai'.")
    except Exception as e:
        print(f"Error: {str(e)}")


def test_anthropic():
    """Test Anthropic API connectivity"""
    try:
        # Import the Anthropic module
        from anthropic import Anthropic
        
        # Check if API key is available
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            print(json.dumps({
                "success": False,
                "error": "ANTHROPIC_API_KEY environment variable not found"
            }))
            return
            
        # Start timing
        start_time = time.time()
        
        # Initialize client
        client = Anthropic(api_key=api_key)
        
        # Make a simple API call
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=50,
            messages=[
                {"role": "user", "content": "Please respond with 'Anthropic connection successful' and nothing else."}
            ]
        )
        
        # End timing
        end_time = time.time()
        response_time_ms = int((end_time - start_time) * 1000)
        
        # Print the result
        print("Anthropic API Test Result:")
        print(f"Status: SUCCESS")
        print(f"Response: {response.content[0].text}")
        print(f"Response time: {response_time_ms}ms")
        
    except ImportError as e:
        print(f"Error: ImportError: {str(e)}. Please install the anthropic package with 'pip install anthropic'.")
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_api_direct.py [openai|anthropic|both]")
        sys.exit(1)
        
    provider = sys.argv[1].lower()
    
    if provider == "openai":
        test_openai()
    elif provider == "anthropic":
        test_anthropic()
    elif provider == "both":
        print("Testing OpenAI API...")
        test_openai()
        print("\nTesting Anthropic API...")
        test_anthropic()
    else:
        print(f"Unknown provider: {provider}. Use 'openai', 'anthropic', or 'both'.")