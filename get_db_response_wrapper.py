#!/usr/bin/env python3
"""
Secure wrapper for fetching database responses
Accepts arguments via command line to avoid shell injection
"""
import sys
import json
import traceback
from sqlalchemy import text
from database import engine

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: get_db_response_wrapper.py <requirement_id> [field_name]'
        }))
        sys.exit(1)
    
    try:
        # Parse arguments safely
        requirement_id = int(sys.argv[1])
        field_name = sys.argv[2] if len(sys.argv) > 2 else 'anthropic_response'
        
        # Validate field name to prevent SQL injection
        allowed_fields = ['anthropic_response', 'openai_response', 'deepseek_response', 'final_response']
        if field_name not in allowed_fields:
            raise ValueError(f'Invalid field name: {field_name}')
        
        # Fetch from database
        with engine.connect() as connection:
            query = text(f'''
                SELECT {field_name}
                FROM excel_requirement_responses 
                WHERE id = :req_id
            ''')
            
            result = connection.execute(query, {'req_id': requirement_id}).fetchone()
            
            if result and result[0]:
                print(json.dumps({'response': result[0]}))
            else:
                print(json.dumps({'response': None}))
                
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

