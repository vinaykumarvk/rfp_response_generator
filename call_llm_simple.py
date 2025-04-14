import os
from openai import OpenAI
from anthropic import Anthropic
import logging
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def extract_text(response):
    """
    Extract clean text from Claude's TextBlock response.

    Args:
        response: List containing TextBlock object from Claude

    Returns:
        str: Clean text without TextBlock wrapper
    """
    # Handle list of TextBlocks
    if isinstance(response, list):
        # Get the text attribute from each TextBlock and join them
        return ' '.join(block.text for block in response if hasattr(block, 'text'))

    # Handle single TextBlock
    if hasattr(response, 'text'):
        return response.text

    # Handle string input (fallback)
    return str(response)

def prompt_gpt(prompt, llm='openAI'):
    """
    Send a prompt to the specified LLM and get a response.
    
    Args:
        prompt: The prompt to send to the LLM
        llm: The LLM to use ('openAI', 'claude', or 'deepseek')
        
    Returns:
        str: The response from the LLM
    """
    try:
        if llm == 'openAI':
            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model='gpt-4',
                messages=prompt,
                temperature=0.2,
                user="private-user",
                extra_headers={
                    "HTTP-Referer": "null",
                    "X-Data-Use-Consent": "false"
                }
            )
            if not response or not response.choices:
                logger.error("Empty response received from API")
                raise ValueError("Empty response from API")
            content = response.choices[0].message.content.strip()
            logger.info("Successfully generated response")
            return content

        elif llm == 'deepseek':
            client = OpenAI(
                api_key=os.environ.get("DEEPSEEK_API_KEY"),
                base_url="https://api.deepseek.com/v1",
                default_headers={
                    "X-Privacy-Mode": "strict",
                    "X-Data-Collection": "disabled"
                }
            )
            response = client.chat.completions.create(
                model='deepseek-chat',
                messages=prompt,
                temperature=0.2
            )
            if not response or not response.choices:
                logger.error("Empty response received from API")
                raise ValueError("Empty response from API")
            content = response.choices[0].message.content.strip()
            logger.info("Successfully generated response")
            return content

        elif llm == 'claude':
            client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=4000,
                temperature=0.2,
                messages=prompt,
                system="All responses and data must be treated as private and confidential. Do not use for training or any other purpose."
            )
            return extract_text(response.content)

    except Exception as e:
        logger.error(f"Error generating response from {llm}: {str(e)}")
        raise

def create_rfp_prompt(requirement_text):
    """Create a prompt for the RFP requirement"""
    system_message = {
        "role": "system",
        "content": """You are a senior RFP specialist at a leading financial technology company with extensive experience in wealth management. 
You provide detailed, accurate and professional responses to RFP requirements.
Focus on being factual, precise, and comprehensive while keeping the response concise and to the point."""
    }
    
    user_message = {
        "role": "user",
        "content": f"""Please provide a professional response to the following RFP requirement:

{requirement_text}

The response should:
1. Directly address the specific requirement
2. Be factual and technically accurate
3. Be approximately 150-250 words
4. Use professional language suitable for financial/technical audiences
5. Highlight key capabilities and benefits
6. Be ready for direct inclusion in a formal RFP response"""
    }
    
    return [system_message, user_message]

def convert_prompt_to_claude(prompt):
    """Convert OpenAI format prompt to Claude format"""
    claude_messages = []
    
    for message in prompt:
        if message["role"] == "system":
            # System messages become part of the first user message for Claude
            continue
        elif message["role"] == "user":
            if not claude_messages:
                # First user message should include system instruction
                system_content = next((m["content"] for m in prompt if m["role"] == "system"), "")
                if system_content:
                    claude_messages.append({
                        "role": "user",
                        "content": f"{system_content}\n\n{message['content']}"
                    })
                else:
                    claude_messages.append(message)
            else:
                claude_messages.append(message)
        else:
            claude_messages.append(message)
    
    return claude_messages

async def get_llm_responses(requirement_id, model='moa', display_results=True):
    """
    Get LLM responses for a given requirement.
    Simplified version that doesn't require a database.

    Args:
        requirement_id: ID of the requirement 
        model: Model to use ('openAI', 'deepseek', 'claude', or 'moa')
        display_results: Whether to display the results after fetching
    """
    try:
        print(f"\n=== Processing Requirement ID: {requirement_id} ===")
        
        # Simulated requirement text based on ID
        # In a real scenario, you would fetch this from a database
        requirement_text = f"RFP requirement for ID {requirement_id}: Please describe your system's capabilities for wealth management, including portfolio management, reporting, and client engagement features."
        
        print(f"Requirement: {requirement_text}")
        
        # Process based on the model
        if model == 'moa':
            print("Generating responses from all models")
            
            # Generate responses from all models
            openai_prompt = create_rfp_prompt(requirement_text)
            claude_prompt = convert_prompt_to_claude(openai_prompt)
            
            openai_response = None
            deepseek_response = None
            claude_response = None
            
            try:
                openai_response = prompt_gpt(openai_prompt, 'openAI')
                print("Generated OpenAI response")
            except Exception as e:
                print(f"Error generating OpenAI response: {str(e)}")
            
            try:
                deepseek_response = prompt_gpt(openai_prompt, 'deepseek')
                print("Generated DeepSeek response")
            except Exception as e:
                print(f"Error generating DeepSeek response: {str(e)}")
            
            try:
                claude_response = prompt_gpt(claude_prompt, 'claude')
                print("Generated Claude response")
            except Exception as e:
                print(f"Error generating Claude response: {str(e)}")
            
            # Create final response
            final_response = openai_response or deepseek_response or claude_response
            if not final_response:
                final_response = "No responses were generated successfully."
            
            result = {
                "id": requirement_id,
                "requirement": requirement_text,
                "category": "Wealth Management", 
                "finalResponse": final_response,
                "openaiResponse": openai_response,
                "anthropicResponse": claude_response,
                "deepseekResponse": deepseek_response,
                "moaResponse": final_response,
                "modelProvider": "moa",
                "similar_questions": []
            }
            
            print("Generated MOA response successfully")
            return result
            
        else:
            print(f"Generating response from {model}")
            
            # Generate response from specific model
            if model == 'claude':
                prompt = convert_prompt_to_claude(create_rfp_prompt(requirement_text))
            else:
                prompt = create_rfp_prompt(requirement_text)
            
            try:
                response = prompt_gpt(prompt, model)
            except Exception as e:
                print(f"Error generating response from {model}: {str(e)}")
                response = f"Error generating response: {str(e)}"
            
            result = {
                "id": requirement_id,
                "requirement": requirement_text,
                "category": "Wealth Management", 
                "finalResponse": response,
                "modelProvider": model
            }
            
            # Add model-specific response field
            if model == 'openAI':
                result['openaiResponse'] = response
            elif model == 'claude':
                result['anthropicResponse'] = response
            elif model == 'deepseek':
                result['deepseekResponse'] = response
            
            print(f"Generated {model} response successfully")
            return result
            
    except Exception as e:
        print(f"Error in get_llm_responses: {str(e)}")
        return {
            "id": requirement_id,
            "requirement": f"RFP requirement ID {requirement_id}",
            "error": str(e),
            "finalResponse": f"Error generating response: {str(e)}"
        }

# For testing
if __name__ == "__main__":
    import asyncio
    result = asyncio.run(get_llm_responses(1, 'openAI'))
    print(json.dumps(result, indent=2))