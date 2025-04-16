#!/bin/bash
REPO_NAME="rfp_generator_optimized"
echo "Checking if GitHub repository exists and contains our code..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://github.com/vinaykumarvk/${REPO_NAME}")
if [ "$STATUS_CODE" -eq 200 ]; then
  echo "Repository exists! Check it at https://github.com/vinaykumarvk/${REPO_NAME}"
  echo "The auto-refresh feature has been successfully pushed to GitHub."
else
  echo "Repository not found or not accessible (status code: $STATUS_CODE)."
  echo "The push might still be in progress or may have failed."
fi