#!/bin/bash
# Script to run LLM response generation tests for all models
# Usage: ./run_llm_tests.sh [requirement_id]

# Default requirement ID
REQ_ID=${1:-122}

# File to save test results
RESULTS_FILE="llm_test_results_$(date +%Y%m%d_%H%M%S).txt"

echo "============================"
echo "LLM Response Generation Test"
echo "============================"
echo "Testing with requirement ID: $REQ_ID"
echo "Saving results to: $RESULTS_FILE"
echo "Test started at: $(date)"
echo 

# Run the Python test script and save output
python test_llm_responses.py $REQ_ID | tee $RESULTS_FILE

echo 
echo "Test completed at: $(date)"
echo "Results saved to: $RESULTS_FILE"