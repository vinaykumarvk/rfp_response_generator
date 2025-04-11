#!/usr/bin/env python3
"""
Sequential MOA Implementation

This version runs models sequentially with shorter timeouts for each model,
prioritizing OpenAI and Anthropic, then trying DeepSeek only if there's time remaining.
"""

import sys
import time
import signal
import json
from rfp_response_generator_pg import prompt_gpt, create_rfp_prompt

# Total time allowed for the entire MOA process
TOTAL_TIMEOUT_SECONDS = 120  # 2 minutes for the entire process

# Individual model timeouts - shorter than our 3-minute timeout in prompt_gpt
# to ensure we can try all models within TOTAL_TIMEOUT_SECONDS
MODEL_TIMEOUTS = {
    "openAI": 30,     # 30 seconds for OpenAI
    "anthropic": 30,  # 30 seconds for Anthropic
    "deepseek": 30    # 30 seconds for DeepSeek
}

# Synthesis timeout
SYNTHESIS_TIMEOUT = 30  # 30 seconds for synthesis

def run_model_with_timeout(prompt, model_name):
    """
    Run a model with a specific timeout
    
    Args:
        prompt: The prompt to send to the model
        model_name: Name of the model to use
        
    Returns:
        Dict containing response or error information
    """
    print(f"Requesting response from {model_name}...")
    
    start_time = time.time()
    
    # Set up a timeout for this specific model
    def timeout_handler(signum, frame):
        raise TimeoutError(f"{model_name} timed out after {MODEL_TIMEOUTS[model_name]} seconds")
    
    # Save the original signal handler
    original_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(MODEL_TIMEOUTS[model_name])
    
    try:
        # Call the model (which has its own 3-minute timeout but we'll interrupt sooner)
        response = prompt_gpt(prompt, llm=model_name)
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        
        # Check for errors
        if response.startswith("Error:"):
            print(f"❌ {model_name} error: {response}")
            return {
                "status": "error",
                "error": response,
                "elapsed_time": elapsed_time
            }
        
        # Success
        print(f"✅ {model_name} response received in {elapsed_time:.2f}s")
        return {
            "status": "success",
            "response": response,
            "elapsed_time": elapsed_time
        }
        
    except TimeoutError as e:
        # Our local timeout was reached
        elapsed_time = time.time() - start_time
        print(f"⏱️ {model_name} timed out after {elapsed_time:.2f}s")
        return {
            "status": "timeout",
            "error": str(e),
            "elapsed_time": elapsed_time
        }
        
    except Exception as e:
        # Any other exception
        elapsed_time = time.time() - start_time
        print(f"❌ {model_name} exception: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "elapsed_time": elapsed_time
        }
        
    finally:
        # Cancel the alarm and restore the original signal handler
        signal.alarm(0)
        signal.signal(signal.SIGALRM, original_handler)

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

def generate_moa_response_sequential(requirement, category="Wealth Management Software", previous_responses=""):
    """
    Generate a MOA response sequentially, prioritizing the most reliable models first
    
    Args:
        requirement: The RFP requirement
        category: The category of the requirement
        previous_responses: Previous similar responses for context
        
    Returns:
        Dictionary with the final response and metrics
    """
    print(f"\n{'='*80}\nGENERATING MOA RESPONSE FOR: {requirement}\n{'='*80}")
    
    # Start total timer
    total_start_time = time.time()
    
    # Create the structured prompt
    prompt = create_rfp_prompt(requirement, category, previous_responses)
    
    # Initialize results
    model_responses = {}
    models_attempted = 0
    models_succeeded = 0
    
    # Phase 1: Get responses from models sequentially
    print("\n--- PHASE 1: SEQUENTIAL MODEL RESPONSES ---")
    
    # Priority order for models (most reliable first)
    model_order = ["openAI", "anthropic", "deepseek"]
    
    # Process each model in sequence
    for model_name in model_order:
        # Check if we still have enough time in our total budget
        elapsed_so_far = time.time() - total_start_time
        time_remaining = TOTAL_TIMEOUT_SECONDS - elapsed_so_far
        
        if time_remaining < MODEL_TIMEOUTS[model_name] + SYNTHESIS_TIMEOUT:
            print(f"⏱️ Not enough time left for {model_name} and synthesis. Skipping {model_name}.")
            continue
        
        # Try to get a response from this model
        models_attempted += 1
        result = run_model_with_timeout(prompt, model_name)
        model_responses[model_name.lower()] = result
        
        if result["status"] == "success":
            models_succeeded += 1
    
    # Check if we have any successful responses
    if models_succeeded == 0:
        print("❌ No successful model responses. Cannot synthesize.")
        return {
            "status": "error",
            "message": "All models failed to generate responses",
            "total_time": time.time() - total_start_time
        }
    
    # Phase 2: Synthesize responses
    print("\n--- PHASE 2: SYNTHESIZING RESPONSES ---")
    
    # If we only have one response, use it directly
    if models_succeeded == 1:
        successful_model = next(model for model, result in model_responses.items() 
                               if result.get("status") == "success")
        final_response = model_responses[successful_model]["response"]
        print(f"Only one model succeeded ({successful_model}). Using its response directly.")
    else:
        # Create a synthesis prompt
        print(f"Synthesizing responses from {models_succeeded} models...")
        synthesis_prompt = create_synthesis_prompt(requirement, model_responses)
        
        # Try to synthesize with a timeout
        synthesis_result = run_model_with_timeout(synthesis_prompt, "openAI")
        
        if synthesis_result["status"] == "success":
            final_response = synthesis_result["response"]
        else:
            # Fallback to the OpenAI response, or first available response
            for model_name in model_order:
                model_key = model_name.lower()
                if model_key in model_responses and model_responses[model_key].get("status") == "success":
                    final_response = model_responses[model_key]["response"]
                    print(f"Synthesis failed. Using {model_name} response as fallback.")
                    break
            else:
                final_response = "Failed to generate a response."
    
    # Calculate total time
    total_time = time.time() - total_start_time
    
    print(f"\nMOA process completed in {total_time:.2f}s")
    print(f"Models succeeded: {models_succeeded} of {models_attempted}")
    
    # Return results
    return {
        "status": "success",
        "final_response": final_response,
        "model_responses": {
            model.lower(): result.get("response", "") 
            for model, result in model_responses.items() 
            if result.get("status") == "success"
        },
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
    
    # Generate response
    result = generate_moa_response_sequential(test_requirement)
    
    # Display the final response
    print(f"\n{'='*80}\nFINAL MOA RESPONSE\n{'='*80}\n")
    print(result["final_response"])
    
    # Save the results to a file
    with open("sequential_moa_results.json", "w") as f:
        # Convert any non-serializable objects to strings
        serializable_result = {
            "requirement": test_requirement,
            "final_response": result["final_response"],
            "metrics": result["metrics"],
            "model_responses": result.get("model_responses", {})
        }
        
        json.dump(serializable_result, f, indent=2)
    
    print(f"\nResults saved to sequential_moa_results.json")