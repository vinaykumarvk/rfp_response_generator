#!/usr/bin/env python3
"""
MOA (Mixture of Agents) Handler
Modified to handle potential timeouts with DeepSeek API
Includes a 3-minute timeout for DeepSeek API calls
"""

import sys
import time
from rfp_response_generator_pg import prompt_gpt, create_rfp_prompt

def get_model_response(prompt, model):
    """
    Get response from a specific model with transparent error handling
    
    Args:
        prompt: The prompt to send to the model
        model: The model to use ('openAI', 'anthropic', or 'deepseek')
        
    Returns:
        Dict with response details
    """
    # Start timer
    start_time = time.time()
    
    try:
        # Call model
        print(f"Requesting response from {model}...")
        response = prompt_gpt(prompt, llm=model)
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        print(f"Response received from {model} in {elapsed_time:.2f}s")
        
        # Check if DeepSeek timed out
        if model.lower() == 'deepseek' and response.startswith("Error: DeepSeek API timed out"):
            return {
                "status": "timeout",
                "error": "DeepSeek API timed out after 3 minutes",
                "elapsed_time": elapsed_time
            }
        
        # Check for other errors
        if response.startswith("Error:"):
            print(f"Error from {model}: {response}")
            return {
                "status": "error",
                "error": response,
                "elapsed_time": elapsed_time
            }
        
        # Successful response
        return {
            "status": "success",
            "response": response,
            "elapsed_time": elapsed_time
        }
    except Exception as e:
        # Handle any exceptions
        elapsed_time = time.time() - start_time
        print(f"Exception from {model}: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "elapsed_time": elapsed_time
        }

def create_synthesis_prompt(requirement, responses):
    """
    Generate a prompt to synthesize multiple RFP responses
    
    Args:
        requirement: The RFP requirement text
        responses: Dictionary of model responses
        
    Returns:
        Prompt for synthesis
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
    openai_response = responses.get("openai", {}).get("response", "No response available from OpenAI model.")
    anthropic_response = responses.get("anthropic", {}).get("response", "No response available from Anthropic model.")
    
    # DeepSeek is optional - check if we received a response or had an error
    deepseek_info = responses.get("deepseek", {})
    if deepseek_info.get("status") == "success":
        deepseek_response = deepseek_info.get("response", "")
        deepseek_text = f"RESPONSE FROM MODEL 3 (DEEPSEEK):\n{deepseek_response}"
    else:
        # No DeepSeek response available
        deepseek_text = "Note: Response from third model (DeepSeek) not available due to timeout or error."

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

def moa_generate_response(requirement, category="Wealth Management Software", previous_responses=""):
    """
    Generate a response using the MOA (Mixture of Agents) approach
    
    Args:
        requirement: The RFP requirement text
        category: The category of the requirement
        previous_responses: Previous similar responses for context
        
    Returns:
        Dictionary with the synthesized response and metadata
    """
    # Start with tracking metrics
    start_time = time.time()
    
    # Create the structured prompt for the requirement
    structured_prompt = create_rfp_prompt(requirement, category, previous_responses)
    
    # Phase 1: Get responses from each model
    print(f"\n--- PHASE 1: GENERATING MODEL RESPONSES ---")
    model_responses = {}
    models_to_try = ["openAI", "anthropic", "deepseek"]
    
    # Use longer timeout for DeepSeek (though might still hit system limits)
    timeouts = {
        "openAI": 25,
        "anthropic": 25,
        "deepseek": 25  # Note: System might time out before this
    }
    
    for model in models_to_try:
        print(f"Requesting response from {model}...")
        model_key = model.lower()
        
        # Get response with timeout handling
        result = get_model_response(structured_prompt, model, timeout=timeouts[model])
        model_responses[model_key] = result
        
        if result["status"] == "success":
            print(f"✅ {model} response received in {result.get('elapsed_time', 0):.2f}s")
        else:
            print(f"❌ {model} error: {result.get('error', 'Unknown error')}")
    
    # Check if we have at least OpenAI or Anthropic response
    if not model_responses.get("openai", {}).get("status") == "success" and not model_responses.get("anthropic", {}).get("status") == "success":
        print("Failed to get responses from primary models (OpenAI and Anthropic)")
        return {
            "status": "error",
            "message": "Failed to get responses from primary models",
            "model_responses": model_responses
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
    total_time = time.time() - start_time
    
    # Return results
    return {
        "status": "success",
        "final_response": final_response,
        "model_responses": {
            "openai": model_responses.get("openai", {}).get("response", ""),
            "anthropic": model_responses.get("anthropic", {}).get("response", ""),
            "deepseek": model_responses.get("deepseek", {}).get("response", "")
        },
        "metrics": {
            "total_time": total_time,
            "models_succeeded": sum(1 for m in model_responses.values() if m.get("status") == "success"),
            "models_attempted": len(models_to_try)
        }
    }

# Test function
if __name__ == "__main__":
    # Sample requirement for testing
    test_requirement = "Describe your platform's portfolio rebalancing capabilities and how they enhance advisor efficiency."
    
    # Generate MOA response
    print(f"\n{'='*80}\nTESTING MOA RESPONSE GENERATOR\n{'='*80}")
    print(f"\nRequirement: {test_requirement}")
    
    result = moa_generate_response(test_requirement)
    
    print(f"\n{'='*80}\nFINAL MOA RESPONSE\n{'='*80}")
    print(result["final_response"])
    
    print(f"\n{'='*80}\nPERFORMANCE METRICS\n{'='*80}")
    print(f"Total time: {result['metrics']['total_time']:.2f}s")
    print(f"Models succeeded: {result['metrics']['models_succeeded']} of {result['metrics']['models_attempted']}")