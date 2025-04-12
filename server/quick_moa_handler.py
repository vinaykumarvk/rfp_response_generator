#!/usr/bin/env python3
"""
Quick MOA route handler
This is a simplified version for testing only
"""

import sys
import json
import time
from quick_moa_test import generate_mock_moa_response

def handle_request():
    """
    Handle a request for MOA processing
    
    Reads the request data from stdin and writes the response to stdout
    """
    try:
        # Read the request from stdin
        request_json = sys.stdin.read()
        request = json.loads(request_json)
        
        # Extract the requirement text
        requirement = request.get("requirement", "")
        
        if not requirement:
            # Return an error if no requirement text provided
            response = {
                "status": "error",
                "message": "Missing requirement parameter"
            }
            print(json.dumps(response))
            return
        
        # Generate the mock MOA response
        result = generate_mock_moa_response(requirement)
        
        # Output the result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        # Handle any errors
        error_response = {
            "status": "error",
            "message": f"Error in MOA handler: {str(e)}"
        }
        print(json.dumps(error_response))

if __name__ == "__main__":
    handle_request()