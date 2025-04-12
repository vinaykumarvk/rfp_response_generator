#!/usr/bin/env python3
"""
Handler for get_final_responses function
This script provides an API endpoint handler for the get_final_responses function
"""

import sys
import json
from test_get_final_responses import get_final_responses

def handle_request():
    """
    Handle a request for the get_final_responses function
    
    Reads the request data from stdin and writes the response to stdout
    """
    try:
        # Read the request from stdin
        request_json = sys.stdin.read()
        request = json.loads(request_json)
        
        # Extract the requirement text and optional parameters
        requirement = request.get("requirement", "")
        category = request.get("category", "Wealth Management Software")
        previous_responses = request.get("previous_responses", "")
        
        if not requirement:
            # Return an error if no requirement text provided
            response = {
                "status": "error",
                "message": "Missing requirement parameter"
            }
            print(json.dumps(response))
            return
        
        # Generate the MOA response using get_final_responses
        result = get_final_responses(requirement, category, previous_responses)
        
        # Output the result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        # Handle any errors
        error_response = {
            "status": "error",
            "message": f"Error in final responses handler: {str(e)}"
        }
        print(json.dumps(error_response))

if __name__ == "__main__":
    handle_request()