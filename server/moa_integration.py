#!/usr/bin/env python3
"""
Production-ready MOA integration optimized for the system constraints.
This module implements a practical approach to the MOA (Mixture of Agents) concept
that works reliably within the timeout constraints of the system.
"""

import sys
import time
import json
from rfp_response_generator_pg import prompt_gpt, create_rfp_prompt

def get_model_response(prompt, model_name, max_retries=1):
    """
    Get a response from a specified model with basic retry logic
    
    Args:
        prompt: The prompt to send to the model
        model_name: Name of the model to use
        max_retries: Maximum number of retry attempts if the initial call fails
        
    Returns:
        Dict containing the model response or error information
    """
    start_time = time.time()
    
    print(f"Requesting response from {model_name}...")
    
    attempts = 0
    while attempts <= max_retries:
        attempts += 1
        
        try:
            response = prompt_gpt(prompt, llm=model_name)
            elapsed_time = time.time() - start_time
            
            if response.startswith("Error:"):
                print(f"❌ {model_name} error: {response}")
                
                if "timeout" in response.lower() and attempts <= max_retries:
                    print(f"Retrying {model_name} (attempt {attempts}/{max_retries})...")
                    continue
                    
                return {
                    "status": "error",
                    "error": response,
                    "elapsed_time": elapsed_time
                }
            
            # Success case
            print(f"✅ {model_name} response received in {elapsed_time:.2f}s")
            return {
                "status": "success",
                "response": response,
                "elapsed_time": elapsed_time
            }
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = str(e)
            print(f"❌ {model_name} exception: {error_msg}")
            
            if "timeout" in error_msg.lower() and attempts <= max_retries:
                print(f"Retrying {model_name} (attempt {attempts}/{max_retries})...")
                continue
                
            return {
                "status": "error",
                "error": error_msg,
                "elapsed_time": elapsed_time
            }
    
    # Should never reach here, but just in case
    return {
        "status": "error",
        "error": "Maximum retry attempts exceeded",
        "elapsed_time": time.time() - start_time
    }

def create_synthesis_prompt(requirement, model_responses):
    """
    Create a prompt for synthesizing multiple model responses
    
    Args:
        requirement: The RFP requirement text
        model_responses: Dictionary of model responses
        
    Returns:
        List of message dictionaries for the prompt
    """
    system_message = """You are an expert AI Synthesizer specialized in creating optimal RFP (Request for Proposal) responses.
Your task is to analyze AI-generated responses to the same RFP requirement, critically evaluate their strengths and weaknesses,
and synthesize them into a single, cohesive, high-quality response.

Focus on:
1. Extracting the most accurate, relevant, and specific content from each response
2. Ensuring technical accuracy and domain-appropriate terminology
3. Maintaining a professional, confident tone
4. Creating a coherent flow with proper transitions
5. Providing specific details rather than generic statements
6. Addressing all aspects of the requirement comprehensively
7. Structuring the response in clear, readable paragraphs

The final response should demonstrate deep expertise in wealth management, directly address the requirement,
and be optimized for persuasiveness and clarity."""

    # Build the user message
    user_message = f"""I need you to synthesize the best possible RFP response by analyzing and combining elements from these AI-generated responses to the following requirement:

REQUIREMENT: {requirement}

"""

    # Add each available model response
    for model_name, result in model_responses.items():
        if result.get("status") == "success":
            response = result.get("response", "")
            user_message += f"\nRESPONSE FROM {model_name.upper()}:\n{response}\n"
    
    user_message += """\nCreate a single synthesized response that incorporates the best elements from all responses, 
addresses any gaps or inaccuracies, and forms a comprehensive answer to the requirement. 
The synthesized response should stand alone as a complete, professional RFP response."""

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

def generate_integrated_moa_response(requirement, category="Wealth Management Software", previous_responses=""):
    """
    Generate a MOA response using our integrated approach
    
    Args:
        requirement: The RFP requirement
        category: The category of the requirement
        previous_responses: Previous similar responses for context
        
    Returns:
        Dictionary with the final response and metrics
    """
    # Start timing the entire process
    total_start_time = time.time()
    
    # Initialize results data
    model_responses = {}
    models_attempted = 0
    models_succeeded = 0
    
    # Create the prompt once for all models
    prompt = create_rfp_prompt(requirement, category, previous_responses)
    
    # Step 1: Always try OpenAI (most reliable)
    models_attempted += 1
    openai_result = get_model_response(prompt, "openAI")
    model_responses["openai"] = openai_result
    
    if openai_result["status"] == "success":
        models_succeeded += 1
    
    # Step 2: Always try Anthropic (also reliable)
    models_attempted += 1
    anthropic_result = get_model_response(prompt, "anthropic")
    model_responses["anthropic"] = anthropic_result
    
    if anthropic_result["status"] == "success":
        models_succeeded += 1
    
    # Step 3: Try DeepSeek only if we have time and at least one other model worked
    elapsed_so_far = time.time() - total_start_time
    if elapsed_so_far < 60 and models_succeeded > 0:  # If we're under 60 seconds so far
        models_attempted += 1
        deepseek_result = get_model_response(prompt, "deepseek")
        model_responses["deepseek"] = deepseek_result
        
        if deepseek_result["status"] == "success":
            models_succeeded += 1
    else:
        print("Skipping DeepSeek due to time constraints or previous model failures")
    
    # Step 4: Generate final response
    if models_succeeded == 0:
        # No models succeeded, return error
        return {
            "status": "error",
            "message": "All models failed to generate responses",
            "model_responses": {},
            "metrics": {
                "total_time": time.time() - total_start_time,
                "models_succeeded": 0,
                "models_attempted": models_attempted
            }
        }
    
    elif models_succeeded == 1:
        # Only one model succeeded, use its response directly
        successful_model = next(model for model, result in model_responses.items() 
                                if result.get("status") == "success")
        
        final_response = model_responses[successful_model]["response"]
        
        # Record which model was used
        used_model = successful_model
        
    else:
        # Multiple models succeeded, synthesize responses
        synthesis_prompt = create_synthesis_prompt(requirement, model_responses)
        synthesis_result = get_model_response(synthesis_prompt, "openAI")
        
        if synthesis_result["status"] == "success":
            final_response = synthesis_result["response"]
            used_model = "moa"
        else:
            # Fallback to OpenAI if available, otherwise Anthropic
            if model_responses["openai"]["status"] == "success":
                final_response = model_responses["openai"]["response"]
                used_model = "openai"
            else:
                final_response = model_responses["anthropic"]["response"]
                used_model = "anthropic"
    
    # Calculate total time
    total_time = time.time() - total_start_time
    
    # Prepare model-specific responses for the database
    model_specific_responses = {
        "openai_response": model_responses.get("openai", {}).get("response", ""),
        "anthropic_response": model_responses.get("anthropic", {}).get("response", ""),
        "deepseek_response": model_responses.get("deepseek", {}).get("response", ""),
        "moa_response": final_response if used_model == "moa" else ""
    }
    
    # Return the complete result
    return {
        "status": "success",
        "requirement": requirement,
        "final_response": final_response,
        "used_model": used_model,
        "model_specific_responses": model_specific_responses,
        "metrics": {
            "total_time": total_time,
            "models_succeeded": models_succeeded,
            "models_attempted": models_attempted
        }
    }

# Test function
if __name__ == "__main__":
    # Sample requirement for testing
    test_requirement = "Describe document management capabilities for wealth management platforms."
    
    print(f"\n{'='*80}")
    print(f"TESTING INTEGRATED MOA APPROACH")
    print(f"{'='*80}")
    print(f"\nRequirement: {test_requirement}")
    
    # Generate response
    result = generate_integrated_moa_response(test_requirement)
    
    # Display stats
    print(f"\n{'='*80}")
    print(f"MOA RESULTS")
    print(f"{'='*80}")
    print(f"Status: {result['status']}")
    print(f"Total time: {result['metrics']['total_time']:.2f}s")
    print(f"Models succeeded: {result['metrics']['models_succeeded']} of {result['metrics']['models_attempted']}")
    print(f"Model used for final response: {result.get('used_model', 'none')}")
    
    # Display the final response
    print(f"\n{'='*80}")
    print(f"FINAL RESPONSE")
    print(f"{'='*80}")
    print(result["final_response"])
    
    # Save the results to a file
    with open("moa_integration_results.json", "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"\nResults saved to moa_integration_results.json")