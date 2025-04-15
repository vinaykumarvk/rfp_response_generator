#!/bin/bash
# Comprehensive test script that runs both LLM and API tests
# Usage: ./run_comprehensive_tests.sh [requirement_id]

# Default requirement ID
REQ_ID=${1:-122}

# Create a directory for test results if it doesn't exist
RESULTS_DIR="test_results"
mkdir -p $RESULTS_DIR

# Generate timestamp for this test run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Filenames for results
LLM_RESULTS_FILE="$RESULTS_DIR/llm_test_$TIMESTAMP.txt"
API_RESULTS_FILE="$RESULTS_DIR/api_test_$TIMESTAMP.txt"
SUMMARY_FILE="$RESULTS_DIR/test_summary_$TIMESTAMP.txt"

echo "======================================"
echo "COMPREHENSIVE LLM RESPONSE TESTING"
echo "======================================"
echo "Testing with requirement ID: $REQ_ID"
echo "Test started at: $(date)"
echo

# Write to summary file
echo "LLM Response Testing Summary" > $SUMMARY_FILE
echo "===========================" >> $SUMMARY_FILE
echo "Test run at: $(date)" >> $SUMMARY_FILE
echo "Requirement ID: $REQ_ID" >> $SUMMARY_FILE
echo >> $SUMMARY_FILE

# Part 1: Run direct LLM tests through Python function calls
echo "PART 1: Testing LLM function calls directly..."
echo "Saving results to: $LLM_RESULTS_FILE"
python test_llm_responses.py $REQ_ID | tee $LLM_RESULTS_FILE

# Extract result summary and add to summary file
echo "Direct LLM Test Results:" >> $SUMMARY_FILE
grep -A 10 "TEST SUMMARY" $LLM_RESULTS_FILE >> $SUMMARY_FILE
echo >> $SUMMARY_FILE

# Part 2: Run API endpoint tests
echo
echo "PART 2: Testing API endpoint responses..."
echo "Saving results to: $API_RESULTS_FILE"
python test_api_responses.py $REQ_ID | tee $API_RESULTS_FILE

# Extract result summary and add to summary file
echo "API Endpoint Test Results:" >> $SUMMARY_FILE
grep -A 10 "API TEST SUMMARY" $API_RESULTS_FILE >> $SUMMARY_FILE

echo
echo "Test completed at: $(date)"
echo "Summary saved to: $SUMMARY_FILE"
echo
echo "TEST RESULTS SUMMARY:"
cat $SUMMARY_FILE