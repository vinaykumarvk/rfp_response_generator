"""
Prompt generation utilities for RFP response generation
"""
import json
import logging
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_rfp_prompt(requirement: str, category: Optional[str] = None, previous_responses: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Create an optimized prompt for RFP response generation.

    Args:
        requirement: The current RFP requirement to address.
        category: Functional category of the requirement (optional).
        previous_responses: List of previous responses with their similarity scores (optional).

    Returns:
        List of message dictionaries for LLM.
    """
    logger.info(f"Creating prompt for requirement: {requirement}")
    logger.info(f"Category: {category}")
    logger.info(f"Previous responses available: {len(previous_responses or [])} items")
    
    # System prompt with instructions
    messages = [
        {
            "role": "system",
            "content": """You are an expert in generating high-quality responses for RFPs (Request for Proposals) in the financial technology sector. 
Your task is to generate a comprehensive, accurate, and professional response to the given requirement.

Guidelines for your response:
1. Be thorough but concise, focusing on the most relevant information
2. Use professional, confident language appropriate for formal business communication
3. Highlight key capabilities, features, and benefits clearly
4. Structure your response with logical organization
5. Avoid generic claims; instead, provide specific details about capabilities
6. Keep your response properly formatted for readability"""
        }
    ]
    
    # Add context from similar responses if available
    context = ""
    if previous_responses and len(previous_responses) > 0:
        context = "Here are some example responses to similar requirements that may help inform your response:\n\n"
        for i, resp in enumerate(previous_responses[:3], 1):  # Use up to 3 similar responses
            context += f"Example {i} (Similarity: {resp.get('similarity_score', 0):.2f}):\n"
            context += f"Requirement: {resp.get('requirement', '')}\n"
            context += f"Response: {resp.get('response', '')}\n\n"
    
    # Add category context if available
    category_context = ""
    if category:
        category_context = f"This requirement is categorized as: {category}\n\n"
    
    # Add the requirement and context to the prompt
    user_content = f"{category_context}Please provide a comprehensive response to the following RFP requirement:\n\n{requirement}\n\n{context}"
    messages.append({
        "role": "user",
        "content": user_content
    })
    
    # Print the full prompt for debugging
    prompt_preview = f"""
======== GENERATED PROMPT ========
SYSTEM: {messages[0]['content'][:100]}...
USER: {user_content[:500]}...
================================
"""
    print(prompt_preview)
    logger.info(prompt_preview)
    
    return messages

def convert_prompt_to_claude(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert a standard prompt format to Claude-compatible format.

    Args:
        messages: List of message dictionaries in standard format.

    Returns:
        List of message dictionaries in Claude format.
    """
    # Claude format is similar, but may need adjustments
    claude_messages = []
    
    for msg in messages:
        # Claude uses 'human' instead of 'user' and 'assistant' instead of 'assistant'
        role = "human" if msg["role"] == "user" else ("assistant" if msg["role"] == "assistant" else msg["role"])
        claude_messages.append({"role": role, "content": msg["content"]})
    
    return claude_messages

def find_similar_matches_and_generate_prompt(requirement_id: int) -> List[Dict[str, Any]]:
    """
    Find similar matches for a requirement and use them to generate a prompt.

    Args:
        requirement_id: ID of the requirement to find matches for

    Returns:
        List of message dictionaries for the LLM
    """
    try:
        # Import here to avoid circular imports
        from find_matches import find_similar_matches
        from database import engine
        from sqlalchemy import text
        
        # Get the requirement details
        with engine.connect() as connection:
            req_query = text("""
                SELECT id, requirement, category 
                FROM excel_requirement_responses 
                WHERE id = :req_id
            """)
            requirement = connection.execute(req_query, {"req_id": requirement_id}).fetchone()
            
            if not requirement:
                logger.error(f"No requirement found with ID: {requirement_id}")
                return create_rfp_prompt(f"Missing requirement with ID {requirement_id}")
        
        # Find similar matches
        matches_result = find_similar_matches(requirement_id)
        
        if not matches_result.get("success", False):
            logger.error(f"Error finding similar matches: {matches_result.get('error', 'Unknown error')}")
            return create_rfp_prompt(requirement[1], requirement[2])
        
        # Extract similar matches
        similar_matches = matches_result.get("similar_matches", [])
        
        # Create the prompt using the requirement and similar matches
        return create_rfp_prompt(requirement[1], requirement[2], similar_matches)
        
    except Exception as e:
        logger.error(f"Error in find_similar_matches_and_generate_prompt: {str(e)}")
        return create_rfp_prompt("Error retrieving requirement information")