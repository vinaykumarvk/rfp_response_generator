#!/usr/bin/env python3
"""
Secure wrapper for calling LLM functions
Accepts arguments via command line (properly escaped) to avoid shell injection
"""
import sys
import json
import traceback
from call_llm import get_llm_responses
from sqlalchemy import text
from database import engine

def main():
    if len(sys.argv) < 4:
        print(json.dumps({
            'success': False,
            'error': 'Usage: call_llm_wrapper.py <requirement_id> <model> <skip_similarity_search>'
        }))
        sys.exit(1)
    
    try:
        # Parse arguments safely (no shell injection possible)
        requirement_id = int(sys.argv[1])
        model = sys.argv[2]
        skip_similarity_search = sys.argv[3].lower() == 'true'
        
        # Validate model name
        allowed_models = ['openai', 'anthropic', 'deepseek', 'moa']
        if model.lower() not in allowed_models:
            raise ValueError(f'Invalid model: {model}. Allowed: {allowed_models}')
        
        # Call the LLM function
        get_llm_responses(requirement_id, model, False, skip_similarity_search)
        
        # Fetch the response from database
        with engine.connect() as connection:
            query = text('''
                SELECT 
                    id, 
                    final_response, 
                    openai_response, 
                    anthropic_response, 
                    deepseek_response,
                    model_provider
                FROM excel_requirement_responses 
                WHERE id = :req_id
            ''')
            
            result = connection.execute(query, {'req_id': requirement_id}).fetchone()
            
            if result:
                response_data = {
                    'id': result[0],
                    'finalResponse': result[1],
                    'openaiResponse': result[2], 
                    'anthropicResponse': result[3],
                    'deepseekResponse': result[4],
                    'modelProvider': result[5] or model,
                    'success': True,
                    'message': 'Response generated successfully'
                }
                print(json.dumps(response_data))
            else:
                print(json.dumps({
                    'success': False,
                    'error': 'No response found after generation'
                }))
                sys.exit(1)
                
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

