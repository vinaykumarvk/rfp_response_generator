#!/usr/bin/env python3
"""
Handler for get_final_responses function
This script provides an API endpoint handler for the get_final_responses function
"""

import sys
import json
from test_get_final_responses import get_final_responses
from vector_search import find_similar_requirements

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
        
        # First, find similar requirements using vector search
        sys.stderr.write(f"Finding similar requirements for: {requirement}\n")
        similar_requirements = find_similar_requirements(
            query_text=requirement,
            k=5,
            similarity_threshold=0.3
        )
        
        # Format the similar requirements for the get_final_responses function
        formatted_similar = []
        for req in similar_requirements:
            formatted_similar.append({
                'requirement': req['requirement'],
                'response': req['response'] or '',
                'category': req['category'],
                'similarity': req['similarity']
            })
        
        # Convert to the expected format for previous_responses
        if formatted_similar:
            previous_responses_text = json.dumps(formatted_similar)
            sys.stderr.write(f"Found {len(formatted_similar)} similar requirements\n")
        else:
            previous_responses_text = ""
            sys.stderr.write("No similar requirements found\n")
        
        # Generate the MOA response using get_final_responses
        result = get_final_responses(requirement, category, previous_responses_text)
        
        # Add the similar requirements to the result
        result["similar_requirements"] = formatted_similar
        
        # Output the result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        # Handle any errors
        error_response = {
            "status": "error",
            "message": f"Error in final responses handler: {str(e)}"
        }
        print(json.dumps(error_response))
        sys.stderr.write(f"Error: {str(e)}\n")

if __name__ == "__main__":
    handle_request()