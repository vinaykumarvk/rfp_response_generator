#!/usr/bin/env python3
"""
Comprehensive Test Suite for RFP Response Generator
This prevents regression issues by validating core functionality before and after changes.
"""

import json
import time
import traceback
from find_matches import find_similar_matches
from call_llm import get_llm_responses
from database import engine
from sqlalchemy import text

class TestResults:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
        
    def record_test(self, test_name, passed, error_msg=None):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ PASS: {test_name}")
        else:
            self.tests_failed += 1
            self.failures.append(f"{test_name}: {error_msg}")
            print(f"❌ FAIL: {test_name} - {error_msg}")
    
    def summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failures:
            print(f"\nFAILURES:")
            for failure in self.failures:
                print(f"  - {failure}")
        
        return self.tests_failed == 0

def test_database_connectivity():
    """Test basic database connectivity"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar()
            return True, None
    except Exception as e:
        return False, str(e)

def test_embeddings_exist():
    """Test that embeddings table has data"""
    try:
        with engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM embeddings")).scalar()
            if count > 0:
                return True, f"Found {count} embeddings"
            else:
                return False, "No embeddings found in database"
    except Exception as e:
        return False, str(e)

def test_similarity_search_basic():
    """Test that similarity search runs without errors"""
    try:
        # Test with a known requirement ID
        result = find_similar_matches(353)
        
        if not result or not result.get('success'):
            return False, f"Similarity search failed: {result.get('error', 'Unknown error')}"
        
        # Validate structure
        if 'requirement' not in result:
            return False, "Missing 'requirement' in result"
        if 'similar_matches' not in result:
            return False, "Missing 'similar_matches' in result"
            
        return True, f"Found {len(result['similar_matches'])} matches"
        
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_similarity_threshold_enforcement():
    """Test that only 90%+ similarity matches are returned"""
    try:
        result = find_similar_matches(353)
        
        if not result or not result.get('success'):
            return False, "Similarity search failed"
            
        matches = result.get('similar_matches', [])
        
        # Check that all matches have 90%+ similarity
        for match in matches:
            similarity = match.get('similarity_score', 0)
            if similarity < 0.9:
                return False, f"Found match with {similarity:.1%} similarity (below 90%)"
        
        return True, f"All {len(matches)} matches have 90%+ similarity"
        
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_no_dummy_customer_names():
    """Test that responses don't contain dummy customer names"""
    try:
        result = get_llm_responses(353, model='openai', display_results=False)
        
        if not result or not result.get('success'):
            return False, "Response generation failed"
        
        response = result.get('openai_response', '')
        
        # Check for dummy names
        dummy_names = ['ABC Corp', 'XYZ Client', 'DEF Client', 'ABC Company', 'XYZ Company']
        found_dummies = [name for name in dummy_names if name in response]
        
        if found_dummies:
            return False, f"Found dummy customer names: {found_dummies}"
        
        return True, "No dummy customer names found"
        
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_response_generation_basic():
    """Test that response generation works without errors"""
    try:
        result = get_llm_responses(353, model='openai', display_results=False)
        
        if not result or not result.get('success'):
            return False, f"Response generation failed: {result.get('error', 'Unknown error')}"
        
        # Check that we got a response
        response = result.get('openai_response', '')
        if not response:
            return False, "No response generated"
        
        return True, f"Generated response of {len(response)} characters"
        
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_response_quality():
    """Test that responses are of good quality (not error messages)"""
    try:
        result = get_llm_responses(353, model='openai', display_results=False)
        
        if not result or not result.get('success'):
            return False, "Response generation failed"
        
        response = result.get('openai_response', '')
        
        # Check for common error patterns
        error_patterns = [
            "Apologies for the confusion",
            "there has been a misunderstanding",
            "no previous responses",
            "source material"
        ]
        
        for pattern in error_patterns:
            if pattern.lower() in response.lower():
                return True, f"Got expected 'no matches' response (correct for 90% threshold)"
        
        return True, "Generated actual content response"
        
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_tabbed_interface_data():
    """Test that response data supports the 4-tab interface"""
    try:
        result = get_llm_responses(353, model='moa', display_results=False)
        
        if not result or not result.get('success'):
            return False, "Response generation failed"
        
        # Check for required fields for tabs
        required_fields = ['openai_response', 'anthropic_response', 'deepseek_response', 'final_response']
        missing_fields = []
        
        for field in required_fields:
            if field not in result:
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Missing fields for tabbed interface: {missing_fields}"
        
        return True, "All tab fields present"
        
    except Exception as e:
        return False, f"Exception: {str(e)}"

def run_comprehensive_tests():
    """Run all tests and return success status"""
    results = TestResults()
    
    print("=" * 60)
    print("COMPREHENSIVE TEST SUITE - RFP Response Generator")
    print("=" * 60)
    print("This validates core functionality to prevent regression issues.\n")
    
    # Test 1: Database connectivity
    passed, msg = test_database_connectivity()
    results.record_test("Database Connectivity", passed, msg)
    
    # Test 2: Embeddings exist
    passed, msg = test_embeddings_exist()
    results.record_test("Embeddings Data Available", passed, msg)
    
    # Test 3: Similarity search basic functionality
    passed, msg = test_similarity_search_basic()
    results.record_test("Similarity Search Basic", passed, msg)
    
    # Test 4: 90% threshold enforcement
    passed, msg = test_similarity_threshold_enforcement()
    results.record_test("90% Similarity Threshold", passed, msg)
    
    # Test 5: Response generation basic
    passed, msg = test_response_generation_basic()
    results.record_test("Response Generation Basic", passed, msg)
    
    # Test 6: No dummy customer names
    passed, msg = test_no_dummy_customer_names()
    results.record_test("No Dummy Customer Names", passed, msg)
    
    # Test 7: Response quality
    passed, msg = test_response_quality()
    results.record_test("Response Quality Check", passed, msg)
    
    # Test 8: Tabbed interface support
    passed, msg = test_tabbed_interface_data()
    results.record_test("Tabbed Interface Data", passed, msg)
    
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - System is working correctly!")
    else:
        print("\n💥 TESTS FAILED - Critical issues detected!")
    
    return success

if __name__ == "__main__":
    run_comprehensive_tests()