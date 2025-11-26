#!/usr/bin/env python3
"""
Secure wrapper for finding similar matches
Accepts arguments via command line to avoid shell injection
"""
import sys
import json
import traceback
from find_matches import find_similar_matches

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: find_matches_wrapper.py <requirement_id>'
        }))
        sys.exit(1)
    
    try:
        # Parse arguments safely
        requirement_id = int(sys.argv[1])
        
        # Call the function
        result = find_similar_matches(requirement_id)
        
        # Output JSON result
        print(json.dumps(result))
        
    except ValueError as e:
        error_details = {
            'success': False,
            'error': f'Invalid input: {str(e)}',
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_details))
        sys.exit(1)
    except Exception as e:
        error_details = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_details))
        sys.exit(1)

if __name__ == '__main__':
    main()

