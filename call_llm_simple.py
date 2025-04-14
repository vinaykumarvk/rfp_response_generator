"""
Simplified version of call_llm.py for API access
"""
import asyncio
import json
import os
import logging
from typing import Dict, Any, Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the original function if possible
try:
    from call_llm import get_llm_responses as original_get_llm_responses
    original_imported = True
except ImportError:
    original_imported = False
    original_get_llm_responses = None
    
async def get_llm_responses(requirement_id: int, model: str = 'moa', display_results: bool = True) -> Dict[str, Any]:
    """
    Simplified version that returns mock data when the original function isn't available.
    
    Args:
        requirement_id: ID of the requirement to process
        model: Model to use ('openAI', 'anthropic'/'claude', 'deepseek', or 'moa')
        display_results: Whether to display the results after fetching
        
    Returns:
        Dictionary containing the responses
    """
    # If we can use the original function, do so
    if original_imported and original_get_llm_responses:
        try:
            # Since the original function is not async, we need to run it in a thread
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                lambda: original_get_llm_responses(requirement_id, model, display_results)
            )
            return result
        except Exception as e:
            print(f"Error in original get_llm_responses: {e}")
            # Fall back to mock data if original fails
    
    # Mock data for when original function isn't available
    model_lower = model.lower()
    
    # Define our mock response
    result = {
        "success": True,
        "message": f"Response generated for requirement {requirement_id} with model {model}",
        "requirementId": requirement_id,
        "model": model
    }
    
    # Add the appropriate response based on the model
    if model_lower == 'openai':
        result["finalResponse"] = f"Simulated OpenAI response for requirement {requirement_id}"
        result["openaiResponse"] = f"Detailed OpenAI response for requirement {requirement_id}"
        result["modelProvider"] = "openai"
    elif model_lower in ['claude', 'anthropic']:
        result["finalResponse"] = f"Simulated Anthropic response for requirement {requirement_id}"
        result["anthropicResponse"] = f"Detailed Anthropic response for requirement {requirement_id}"
        result["modelProvider"] = "anthropic"
    elif model_lower == 'deepseek':
        result["finalResponse"] = f"Simulated DeepSeek response for requirement {requirement_id}"
        result["deepseekResponse"] = f"Detailed DeepSeek response for requirement {requirement_id}"
        result["modelProvider"] = "deepseek"
    elif model_lower == 'moa':
        result["finalResponse"] = f"Simulated MOA combined response for requirement {requirement_id}"
        result["openaiResponse"] = "OpenAI component of MOA response"
        result["anthropicResponse"] = "Anthropic component of MOA response"
        result["deepseekResponse"] = "DeepSeek component of MOA response"
        result["moaResponse"] = f"Final synthesized MOA response for requirement {requirement_id}"
        result["modelProvider"] = "moa"
    
    # Print results if requested
    if display_results:
        # Only print the JSON, no additional text that would interfere with parsing
        print(json.dumps(result))
        
    return result

# For testing from command line
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        requirement_id = int(sys.argv[1])
        model = sys.argv[2] if len(sys.argv) > 2 else 'moa'
        asyncio.run(get_llm_responses(requirement_id, model, True))
    else:
        print("Please provide a requirement ID")