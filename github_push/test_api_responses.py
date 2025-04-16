#!/usr/bin/env python3
"""
Test script for testing the /api/generate-response endpoint directly.
This simulates how the front-end calls the API and verifies the response structure.
"""

import requests
import json
import time
from datetime import datetime
import sys

def print_separator(title):
    """Print a separator with a title for better test output readability"""
    print("\n" + "=" * 80)
    print(f" {title} ".center(80, "="))
    print("=" * 80)

def test_api_response(requirement_id, model, skip_similarity_search=True):
    """Test the API endpoint for generating responses"""
    print_separator(f"TESTING API RESPONSE FOR {model.upper()}")
    print(f"Testing with requirement ID: {requirement_id}")
    print(f"Model: {model}")
    print(f"Skip similarity search: {skip_similarity_search}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Prepare the API request
    url = "http://localhost:5000/api/generate-response"
    payload = {
        "requirementId": requirement_id,
        "provider": model,
        "skipSimilaritySearch": skip_similarity_search
    }
    
    print(f"Sending request to {url} with payload: {json.dumps(payload, indent=2)}")
    
    start_time = time.time()
    try:
        # Make the API request
        response = requests.post(url, json=payload)
        
        # Calculate response time
        response_time = time.time() - start_time
        print(f"Response received in {response_time:.2f} seconds")
        
        # Check the response status
        print(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            # Parse the response JSON
            response_data = response.json()
            
            # Check if the response has the expected fields
            expected_fields = ["success", "finalResponse"]
            missing_fields = [field for field in expected_fields if field not in response_data]
            
            if not missing_fields:
                print("\nResponse structure validation: PASSED ✅")
                
                # Check response content
                if response_data.get("success") == True:
                    print("Response success flag: PASSED ✅")
                    
                    # Check if there's actual content in the response
                    final_response = response_data.get("finalResponse", "")
                    if final_response and len(final_response) > 100:
                        print(f"Response content validation: PASSED ✅ (length: {len(final_response)} chars)")
                        print(f"Response preview: {final_response[:150]}...")
                        
                        # Check model-specific response
                        model_field = None
                        if model.lower() == "openai":
                            model_field = "openaiResponse"
                        elif model.lower() in ["anthropic", "claude"]:
                            model_field = "anthropicResponse"
                        elif model.lower() == "deepseek":
                            model_field = "deepseekResponse"
                        elif model.lower() == "moa":
                            model_field = "moaResponse"
                            
                        if model_field and model_field in response_data and response_data[model_field]:
                            print(f"Model-specific response ({model_field}): PASSED ✅")
                        else:
                            print(f"Model-specific response ({model_field}): FAILED ❌ (field missing or empty)")
                            
                        return True, response_data
                    else:
                        print("Response content validation: FAILED ❌ (response content too short or empty)")
                else:
                    print(f"Response success flag: FAILED ❌ (success is False)")
                    if "error" in response_data:
                        print(f"Error message: {response_data['error']}")
            else:
                print(f"\nResponse structure validation: FAILED ❌ (missing fields: {missing_fields})")
                
            # Print the full response for debugging
            print("\nFull response:")
            print(json.dumps(response_data, indent=2))
            
            return False, response_data
        else:
            print(f"API request failed with status code: {response.status_code}")
            print(f"Response content: {response.text}")
            return False, None
    except Exception as e:
        print(f"Error during API test: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False, None

def run_api_tests(requirement_id):
    """Run API tests for all models"""
    print_separator("API RESPONSE GENERATION TEST SUITE")
    
    results = {
        "openai": False,
        "anthropic": False,
        "deepseek": False,
        "moa": False,
        "total_passed": 0,
        "total_failed": 0
    }
    
    # Test each model
    models = ["openai", "anthropic", "deepseek", "moa"]
    for model in models:
        success, _ = test_api_response(requirement_id, model)
        results[model] = success
        
        if success:
            results["total_passed"] += 1
        else:
            results["total_failed"] += 1
        
        # Add a delay between tests to avoid overloading the API
        if model != models[-1]:
            print("Waiting 2 seconds before next test...")
            time.sleep(2)
    
    # Print summary
    print_separator("API TEST SUMMARY")
    print(f"Total tests passed: {results['total_passed']} / {len(models)}")
    
    for model, passed in results.items():
        if model not in ["total_passed", "total_failed"]:
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{model.upper().ljust(10)}: {status}")
    
    return results

if __name__ == "__main__":
    # Get requirement ID from command line arguments or use default
    requirement_id = int(sys.argv[1]) if len(sys.argv) > 1 else 122
    
    run_api_tests(requirement_id)