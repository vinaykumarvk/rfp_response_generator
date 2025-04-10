#!/bin/bash

# Simple test script to test the direct update API

if [ -z "$1" ]; then
  echo "Usage: $0 <requirement_id>"
  exit 1
fi

REQUIREMENT_ID=$1
TEST_RESPONSE="This is a direct test response created at $(date)"

echo "Testing direct storage update with ID: $REQUIREMENT_ID"
echo "Response: $TEST_RESPONSE"

# Call the test-storage API
curl -X POST http://localhost:5000/api/test-storage \
  -H "Content-Type: application/json" \
  -d "{\"requirementId\": $REQUIREMENT_ID, \"openaiResponse\": \"$TEST_RESPONSE\"}"

echo -e "\n\nTest completed."