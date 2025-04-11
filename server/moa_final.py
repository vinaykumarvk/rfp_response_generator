#!/usr/bin/env python3
"""
Final MOA Implementation for RFP Response Generator
This module provides a robust Mixture of Agents (MOA) approach using OpenAI, Anthropic and DeepSeek
with proper timeout handling.
"""

import sys
import time
import json
from rfp_response_generator_pg import prompt_gpt, create_rfp_prompt

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

def create_synthesis_prompt(requirement, model_responses):
    """
    Create a prompt for synthesizing multiple model responses
    
    Args:
        requirement: The RFP requirement text
        model_responses: Dictionary of model results
        
    Returns:
        List of message dictionaries for the synthesis prompt
    """
    system_message = """You are an expert AI Synthesizer specialized in creating optimal RFP (Request for Proposal) responses.
Your task is to analyze multiple AI-generated responses to the same RFP requirement, critically evaluate the strengths and weaknesses of each,
and then synthesize them into a single, cohesive, high-quality response.

Focus on:
1. Extracting the most accurate, relevant, and specific content from each response
2. Ensuring technical accuracy and domain-appropriate terminology
3. Maintaining a professional, confident tone
4. Creating a coherent flow with proper transitions
5. Providing specific details rather than generic statements
6. Addressing all aspects of the requirement comprehensively
7. Structuring the response in clear, readable paragraphs

The final response should demonstrate deep expertise in the relevant domain, directly address the requirement,
and be optimized for persuasiveness and clarity."""

    # Format model responses for the prompt
    openai_response = model_responses.get("openai", {}).get("response", "No response available from OpenAI model.")
    anthropic_response = model_responses.get("anthropic", {}).get("response", "No response available from Anthropic model.")
    
    # DeepSeek is optional
    deepseek_info = model_responses.get("deepseek", {})
    if deepseek_info.get("status") == "success":
        deepseek_response = deepseek_info.get("response", "")
        deepseek_text = f"RESPONSE FROM MODEL 3 (DEEPSEEK):\n{deepseek_response}"
    else:
        # No DeepSeek response available
        deepseek_text = "Note: Response from third model (DeepSeek) not available."

    user_message = f"""I need you to synthesize the best possible RFP response by analyzing and combining elements from these AI-generated responses to the following requirement:

REQUIREMENT: {requirement}

RESPONSE FROM MODEL 1 (OPENAI):
{openai_response}

RESPONSE FROM MODEL 2 (ANTHROPIC):
{anthropic_response}

{deepseek_text}

First, briefly analyze the strengths and weaknesses of each available response. Then, create a single synthesized response that incorporates the best elements from all available responses, addresses any gaps or inaccuracies, and forms a comprehensive answer to the requirement. The synthesized response should stand alone as a complete, professional RFP response."""

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

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
    
    # Create synthesis prompt
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