#!/usr/bin/env python3
"""
MOA Quick Implementation for RFP Response Generator
This module provides a faster version of the Mixture of Agents (MOA) approach
with shorter timeouts to ensure we get a response within script timeout limits.
"""

import json
import signal
import time
import os
import random
from typing import Dict, Any, List, Optional, Union

# Import needed modules
try:
    import openai
    import anthropic
except ImportError:
    print("OpenAI or Anthropic API libraries not found. Please install them using: pip install openai anthropic")

# Set up API keys from environment variables
openai.api_key = os.environ.get("OPENAI_API_KEY", "")
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")
deepseek_api_key = os.environ.get("DEEPSEEK_API_KEY", "")

# Define shorter timeout thresholds (in seconds)
MODEL_TIMEOUTS = {
    "openai": 8,       # OpenAI usually responds in 3-6 seconds
    "anthropic": 10,   # Anthropic usually responds in 2-3 seconds 
    "deepseek": 10     # DeepSeek can take 6-7 seconds
}

class TimeoutError(Exception):
    """Custom exception for timeouts"""
    pass

def timeout_handler(signum, frame):
    """Handler for SIGALRM signal"""
    raise TimeoutError("Response generation timed out")

def get_model_response(prompt, model_name, max_retries=1):
    """
    Get a response from a specific model with timing and error handling
    
    Args:
        prompt: The prompt to send to the model
        model_name: Name of the model to use ('openai', 'anthropic', or 'deepseek')
        max_retries: Maximum number of retry attempts (default: 1)
        
    Returns:
        Dict containing response information
    """
    # Normalize model name to lowercase
    model_name = model_name.lower()
    
    # Set initial result
    result = {
        "model": model_name,
        "success": False,
        "response": None,
        "error": None,
        "time_taken": 0
    }
    
    # Configure timeout handler
    timeout_seconds = MODEL_TIMEOUTS.get(model_name, 15)  # Default 15s timeout if not specified
    
    # Try with retries
    for attempt in range(max_retries + 1):
        try:
            start_time = time.time()
            
            # Set up timeout
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout_seconds)
            
            # Call the appropriate API based on model name
            if model_name == "openai":
                # OpenAI API call
                completion = openai.chat.completions.create(
                    model="gpt-4o",  # Use the latest model (gpt-4o)
                    messages=[
                        {"role": "system", "content": "You are a helpful expert in wealth management software."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=800
                )
                response_text = completion.choices[0].message.content
                
            elif model_name == "anthropic":
                # Anthropic API call
                client = anthropic.Anthropic(api_key=anthropic_api_key)
                completion = client.messages.create(
                    model="claude-3-7-sonnet-20250219",  # Use the latest model
                    max_tokens=800,
                    temperature=0.7,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                response_text = completion.content[0].text
                
            elif model_name == "deepseek":
                # Mock DeepSeek response (for testing without actual API calls)
                # This allows the MOA to continue even if DeepSeek is unavailable
                response_text = f"Mock DeepSeek response for prompt: {prompt[:50]}..."
                time.sleep(1)  # Add a slight delay to simulate API call
                
            else:
                raise ValueError(f"Unsupported model: {model_name}")
            
            # Clear the alarm
            signal.alarm(0)
            
            # Calculate time taken
            time_taken = time.time() - start_time
            
            # Prepare successful result
            result = {
                "model": model_name,
                "success": True,
                "response": response_text,
                "error": None,
                "time_taken": time_taken
            }
            
            # Break the retry loop on success
            break
            
        except TimeoutError as e:
            # Handle timeout
            signal.alarm(0)  # Clear the alarm
            result["error"] = f"Timeout after {timeout_seconds}s: {str(e)}"
            time_taken = time.time() - start_time
            result["time_taken"] = time_taken
            print(f"❌ {model_name} timed out after {time_taken:.2f}s on attempt {attempt+1}/{max_retries+1}")
            
            # Continue to next retry or exit loop
            
        except Exception as e:
            # Handle other errors
            signal.alarm(0)  # Clear the alarm
            result["error"] = f"Error: {str(e)}"
            time_taken = time.time() - start_time
            result["time_taken"] = time_taken
            print(f"❌ {model_name} error after {time_taken:.2f}s on attempt {attempt+1}/{max_retries+1}: {str(e)}")
            
            # Continue to next retry or exit loop
    
    return result

def create_synthesis_prompt(requirement, model_responses):
    """Create a synthesis prompt for MOA"""
    # Extract responses from each model that succeeded
    model_output_text = ""
    for model, data in model_responses.items():
        if data["success"] and data["response"]:
            model_output_text += f"\n{model.upper()} RESPONSE:\n{data['response']}\n"
    
    # Create the synthesis prompt
    synthesis_prompt = f"""You are an expert system for synthesizing AI-generated responses to RFP (Request for Proposal) requirements.

REQUIREMENT:
{requirement}

Below are responses generated by different AI models:
{model_output_text}

Your task is to synthesize these responses into a single, coherent response that:
1. Directly addresses the requirement in a comprehensive manner
2. Incorporates the best elements from each model's response
3. Is well-structured, clear, and professionally written
4. Uses concrete examples and specific features where appropriate
5. Is written in the format of a response to an RFP requirement

OUTPUT ONLY THE SYNTHESIZED RESPONSE WITHOUT ANY ADDITIONAL COMMENTS OR EXPLANATIONS.
"""
    return synthesis_prompt

def quick_moa_response(requirement, category="Wealth Management Software", previous_responses=""):
    """
    Generate a quick MOA response for testing
    
    Args:
        requirement: The RFP requirement text
        category: The category of the requirement
        previous_responses: Previous similar responses for context
        
    Returns:
        Dictionary with the synthesized response and metadata
    """
    print("\n--- PHASE 1: GENERATING MODEL RESPONSES ---")
    
    # Prepare result structure
    result = {
        "status": "success",
        "final_response": None,
        "model_responses": {},
        "metrics": {
            "models_attempted": 0,
            "models_succeeded": 0,
            "total_time": 0
        }
    }
    
    start_time = time.time()
    model_responses = {}
    models_to_try = ["openai", "anthropic"]  # Skip DeepSeek to save time
    
    # Track metrics
    result["metrics"]["models_attempted"] = len(models_to_try)
    
    # Generate individual model responses
    for model in models_to_try:
        print(f"Requesting response from {model}...")
        
        # Build the model prompt using the provided function in rfp_response_generator_pg.py
        model_prompt = f"""You are a wealth management software expert. Create a professional RFP response to this requirement:

REQUIREMENT:
{requirement}

RESPONSE FORMAT:
- Address the requirement directly
- Be specific about how your solution meets the requirement
- Include concrete features and benefits
- Keep your response concise yet thorough (150-200 words)

PREVIOUS RESPONSES FOR CONTEXT:
{previous_responses}
"""
        
        # Get response for this model
        model_result = get_model_response(model_prompt, model)
        
        # Store the result
        model_responses[model] = model_result
        
        # Update success count
        if model_result["success"]:
            result["metrics"]["models_succeeded"] += 1
            print(f"✅ {model} response received in {model_result['time_taken']:.2f}s")
        else:
            print(f"❌ {model} response failed: {model_result['error']}")
    
    # Store all model responses in the result
    for model, response_data in model_responses.items():
        if response_data["success"]:
            result["model_responses"][f"{model}_response"] = response_data["response"]
    
    # PHASE 2: If we have at least one successful response, proceed with synthesis
    if result["metrics"]["models_succeeded"] > 0:
        print("\n--- PHASE 2: SYNTHESIZING RESPONSES ---")
        
        if result["metrics"]["models_succeeded"] == 1:
            # If only one model succeeded, use its response directly
            for model, response_data in model_responses.items():
                if response_data["success"]:
                    print(f"Only {model} succeeded, using its response directly")
                    result["final_response"] = response_data["response"]
                    break
        else:
            # Create synthesis prompt
            synthesis_prompt = create_synthesis_prompt(requirement, model_responses)
            
            # Use OpenAI for synthesis (faster and more reliable)
            print("Synthesizing responses with OpenAI...")
            synthesis_result = get_model_response(synthesis_prompt, "openai")
            
            if synthesis_result["success"]:
                print(f"✅ Synthesis completed in {synthesis_result['time_taken']:.2f}s")
                result["final_response"] = synthesis_result["response"]
                result["model_responses"]["moa_response"] = synthesis_result["response"]
            else:
                print(f"❌ Synthesis failed: {synthesis_result['error']}")
                # Use the OpenAI response as fallback if synthesis fails
                if "openai" in model_responses and model_responses["openai"]["success"]:
                    result["final_response"] = model_responses["openai"]["response"]
    else:
        # If all models failed, return an error
        result["status"] = "error"
        result["error"] = "All models failed to generate responses"
    
    # Calculate total time
    result["metrics"]["total_time"] = time.time() - start_time
    
    print(f"\nTotal execution time: {result['metrics']['total_time']:.2f}s")
    print(f"Models succeeded: {result['metrics']['models_succeeded']}/{result['metrics']['models_attempted']}")
    
    return result


# Test function for direct execution
if __name__ == "__main__":
    test_requirement = "The system shall provide a comprehensive dashboard for wealth managers to track client portfolios in real-time."
    response = quick_moa_response(test_requirement)
    print("\nFINAL RESPONSE:")
    print(response["final_response"])