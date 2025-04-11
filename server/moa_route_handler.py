#!/usr/bin/env python3
"""
MOA Route Handler
This script provides a simple interface for the Express server to call the MOA implementation
"""

import sys
import json
import time
from moa_final import generate_moa_response

def handle_moa_request():
    """
    Handle an MOA request from the Express server
    This function reads the request from stdin and writes the response to stdout
    
    Request format (JSON):
    {
        "requirement": "The RFP requirement text",
        "category": "Optional category",
        "previous_responses": "Optional previous responses"
    }
    
    Response format (JSON):
    {
        "status": "success" or "error",
        "final_response": "The synthesized response",
        "model_responses": {
            "openai_response": "...",
            "anthropic_response": "...",
            "deepseek_response": "...",
            "moa_response": "..."
        },
        "metrics": {
            "total_time": seconds,
            "models_succeeded": count,
            "models_attempted": count
        }
    }
    """
    try:
        # Read the request from stdin
        request_json = sys.stdin.read()
        request = json.loads(request_json)
        
        # Extract parameters
        requirement = request.get("requirement", "")
        category = request.get("category", "Wealth Management Software")
        previous_responses = request.get("previous_responses", "")
        
        if not requirement:
            response = {
                "status": "error",
                "message": "Missing requirement parameter"
            }
        else:
            # Generate the MOA response
            result = generate_moa_response(requirement, category, previous_responses)
            response = result
        
        # Write the response to stdout
        sys.stdout.write(json.dumps(response))
        
    except Exception as e:
        # Handle any exceptions
        error_response = {
            "status": "error",
            "message": f"Error generating MOA response: {str(e)}"
        }
        sys.stdout.write(json.dumps(error_response))

# Main execution
if __name__ == "__main__":
    handle_moa_request()