#!/usr/bin/env python3
"""
Test script to verify LLM response generation for all three models.
This script directly tests the LLM calling functionality from call_llm.py.
"""

import sys
import os
import json
from datetime import datetime
from call_llm import get_llm_responses

def print_separator(title):
    """Print a separator with a title for better test output readability"""
    print("\n" + "=" * 80)
    print(f" {title} ".center(80, "="))
    print("=" * 80)

def test_model(requirement_id, model_name):
    """Test a specific model's response generation"""
    print_separator(f"TESTING {model_name.upper()} MODEL")
    print(f"Testing response generation for requirement ID {requirement_id} with model {model_name}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test parameters
    display_results = True      # Show detailed output
    skip_similarity_search = True  # Use existing similar questions
    
    try:
        # Call the get_llm_responses function with the test parameters
        get_llm_responses(
            requirement_id=requirement_id,
            model=model_name,
            display_results=display_results,
            skip_similarity_search=skip_similarity_search
        )
        print(f"\n✅ Test for {model_name} PASSED - Successfully generated response\n")
        return True
    except Exception as e:
        print(f"\n❌ Test for {model_name} FAILED: {str(e)}\n")
        import traceback
        print(traceback.format_exc())
        return False

def run_tests(requirement_id):
    """Run tests for all three models and the MOA (Model of Agreement) synthesis"""
    print_separator("LLM RESPONSE GENERATION TEST SUITE")
    print(f"Testing with requirement ID: {requirement_id}")
    print(f"Test suite started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Keep track of test results
    results = {
        "openai": False,
        "anthropic": False,
        "deepseek": False,
        "moa": False,
        "total_passed": 0,
        "total_failed": 0
    }
    
    # Test individual models
    for model in ["openai", "anthropic", "deepseek"]:
        results[model] = test_model(requirement_id, model)
        if results[model]:
            results["total_passed"] += 1
        else:
            results["total_failed"] += 1
    
    # Test MOA synthesis (which uses all models)
    print_separator("TESTING MOA SYNTHESIS")
    try:
        results["moa"] = test_model(requirement_id, "moa")
        if results["moa"]:
            results["total_passed"] += 1
        else:
            results["total_failed"] += 1
    except Exception as e:
        print(f"❌ MOA synthesis test failed: {str(e)}")
        results["moa"] = False
        results["total_failed"] += 1
    
    # Print summary
    print_separator("TEST SUMMARY")
    print(f"Total tests passed: {results['total_passed']} / {results['total_passed'] + results['total_failed']}")
    
    for model, passed in results.items():
        if model not in ["total_passed", "total_failed"]:
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{model.upper().ljust(10)}: {status}")
    
    print(f"\nTest suite completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return results

if __name__ == "__main__":
    # Get requirement ID from command line arguments or use default
    requirement_id = int(sys.argv[1]) if len(sys.argv) > 1 else 122  # Use the first requirement as default
    
    # Run the tests
    run_tests(requirement_id)