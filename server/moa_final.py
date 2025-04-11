#!/usr/bin/env python3
"""
Final MOA Implementation for RFP Response Generator
This module provides a robust Mixture of Agents (MOA) approach using OpenAI, Anthropic and DeepSeek
with proper timeout handling.
"""

import sys
import time
import json
from rfp_response_generator_pg import prompt_gpt, create_rfp_prompt, create_synthesized_response_prompt

def get_model_response(prompt, model_name):
    """
    Get a response from a specific model with timing and error handling
    
    Args:
        prompt: The prompt to send to the model
        model_name: Name of the model to use ('openAI', 'anthropic', or 'deepseek')
        
    Returns:
        Dict containing response information
    """
    print(f"Requesting response from {model_name}...")
    start_time = time.time()
    
    try:
        # Call the model (which has its own 3-minute timeout)
        response = prompt_gpt(prompt, llm=model_name)
        elapsed_time = time.time() - start_time
        
        # Check for errors
        if response.startswith("Error:"):
            print(f"❌ {model_name} error: {response}")
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
        
        return {
            "status": "error",
            "error": error_msg,
            "elapsed_time": elapsed_time
        }

# Helper function that uses create_synthesized_response_prompt
def create_synthesis_prompt(requirement, model_responses):
    """Create a synthesis prompt using the existing create_synthesized_response_prompt function"""
    # Extract responses from the model_responses structure
    responses = []
    if model_responses.get("openai", {}).get("status") == "success":
        responses.append(model_responses["openai"]["response"])
    if model_responses.get("anthropic", {}).get("status") == "success":
        responses.append(model_responses["anthropic"]["response"])
    if model_responses.get("deepseek", {}).get("status") == "success":
        responses.append(model_responses["deepseek"]["response"])
    
    # Use the existing function
    return create_synthesized_response_prompt(requirement, responses)

def generate_moa_response(requirement, category="Wealth Management Software", previous_responses=""):
    """
    Generate a response using the MOA (Mixture of Agents) approach
    
    Args:
        requirement: The RFP requirement text
        category: The category of the requirement
        previous_responses: Previous similar responses for context
        
    Returns:
        Dictionary with the synthesized response and metadata
    """
    # Start tracking total time
    total_start_time = time.time()
    
    # Create the structured prompt for the requirement
    prompt = create_rfp_prompt(requirement, category, previous_responses)
    
    # Phase 1: Get responses from each model
    print(f"\n--- PHASE 1: GENERATING MODEL RESPONSES ---")
    model_responses = {}
    models_to_try = ["openAI", "anthropic", "deepseek"]
    
    for model in models_to_try:
        # Get response from this model
        result = get_model_response(prompt, model)
        model_key = model.lower()
        model_responses[model_key] = result
    
    # Check if we have at least OpenAI or Anthropic response
    if not model_responses.get("openai", {}).get("status") == "success" and not model_responses.get("anthropic", {}).get("status") == "success":
        print("❌ Failed to get responses from primary models (OpenAI and Anthropic)")
        return {
            "status": "error",
            "message": "Failed to get responses from primary models",
            "model_responses": {
                k: v.get("error", "") for k, v in model_responses.items()
            }
        }
    
    # Phase 2: Synthesize responses (use OpenAI for synthesis)
    print(f"\n--- PHASE 2: SYNTHESIZING RESPONSES ---")
    
    # Create synthesis prompt using the helper function
    synthesis_prompt = create_synthesis_prompt(requirement, model_responses)
    
    # Generate synthesized response
    print("Generating synthesized response with OpenAI...")
    synthesis_result = get_model_response(synthesis_prompt, "openAI")
    
    if synthesis_result["status"] == "success":
        final_response = synthesis_result["response"]
        print(f"✅ Synthesis complete in {synthesis_result.get('elapsed_time', 0):.2f}s")
    else:
        # Fallback to best available response if synthesis fails
        print(f"❌ Synthesis failed: {synthesis_result.get('error', 'Unknown error')}")
        
        if model_responses.get("openai", {}).get("status") == "success":
            final_response = model_responses["openai"]["response"]
            print("Using OpenAI response as fallback")
        elif model_responses.get("anthropic", {}).get("status") == "success":
            final_response = model_responses["anthropic"]["response"]
            print("Using Anthropic response as fallback")
        else:
            final_response = "Failed to generate a response."
    
    # Calculate total time
    total_time = time.time() - total_start_time
    
    # Prepare model-specific responses for the database
    model_outputs = {
        "openai_response": model_responses.get("openai", {}).get("response", ""),
        "anthropic_response": model_responses.get("anthropic", {}).get("response", ""),
        "deepseek_response": model_responses.get("deepseek", {}).get("response", ""),
        "moa_response": final_response
    }
    
    # Count successful models
    models_succeeded = sum(1 for m in model_responses.values() if m.get("status") == "success")
    
    # Return the complete result
    return {
        "status": "success",
        "final_response": final_response,
        "model_responses": model_outputs,
        "metrics": {
            "total_time": total_time,
            "models_succeeded": models_succeeded,
            "models_attempted": len(models_to_try)
        }
    }

# Test function
if __name__ == "__main__":
    # Sample requirement for testing
    test_requirement = "Describe your platform's document management capabilities and how they enhance advisor efficiency."
    
    # Generate MOA response
    print(f"\n{'='*80}\nTESTING MOA RESPONSE GENERATOR\n{'='*80}")
    print(f"\nRequirement: {test_requirement}")
    
    result = generate_moa_response(test_requirement)
    
    print(f"\n{'='*80}\nFINAL MOA RESPONSE\n{'='*80}")
    print(result["final_response"])
    
    print(f"\n{'='*80}\nPERFORMANCE METRICS\n{'='*80}")
    print(f"Total time: {result['metrics']['total_time']:.2f}s")
    print(f"Models succeeded: {result['metrics']['models_succeeded']} of {result['metrics']['models_attempted']}")
    
    # Save results to file
    with open("moa_final_test_results.json", "w") as f:
        json.dump({
            "requirement": test_requirement,
            "final_response": result["final_response"],
            "metrics": result["metrics"],
            "model_responses": result["model_responses"]
        }, f, indent=2)
    
    print(f"\nResults saved to moa_final_test_results.json")