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
    
    # Create the system message with detailed instructions
    system_message = {
        "role": "system",
        "content": f"""You are a senior RFP specialist with over 15 years of experience in wealth management software.
Your expertise lies in crafting precise, impactful, and business-aligned responses to RFP requirements.

**CONTEXT**:
- Domain: Wealth Management Software.
- Requirement Category: {category}.
- Current Requirement: {requirement}.
- Audience: Business professionals and wealth management decision-makers.

**TASK**:
Develop a high-quality response to the current RFP requirement. Use ONLY the provided previous responses as source material, prioritizing content from responses with higher similarity scores.

**GUIDELINES**:
1. **Response Style**:
   - Professional, clear, and concise.
   - Accessible to business professionals, avoiding excessive technical jargon.
   - Focus on business benefits, practical applications, and value propositions.
   - Ensure the response is complete and submission-ready.

2. **Content Rules**:
   - Incorporate ONLY content from the provided previous responses.
   - Prioritize responses with higher similarity scores for relevance.
   - Include ARX security engine references ONLY for entitlement-driven access control questions.
   - Maintain a word count of approximately 200 words.
   - **MANDATORY**: For every claim or feature mentioned, reference the specific source with descriptive context and similarity percentage. Include customer names ONLY when available from the source data (e.g., "as demonstrated in our reporting capabilities response (92% similarity)" or "based on our previous authentication implementation for CustomerName (95% similarity)").

3. **Response Structure**:
   - **Opening Statement**: Highlight the most relevant feature or capability related to the requirement.
   - **Supporting Information**: Include specific examples or benefits that reinforce the feature.
   - **Value Proposition**: End with a strong, tailored statement of value.

4. **Critical Constraints**:
   - Do NOT include any meta-text or commentary (e.g., "Here's the response…", 'Draft Response').
   - Do NOT infer or add content beyond the provided source material.
   - Do NOT include speculative or ambiguous language.
   - **STRICT SOURCING**: Every factual claim must be traceable to a specific example. If no examples support a claim, do NOT include it.

**OUTPUT REQUIREMENTS**:
- A concise response which can be directly put into RFP submission. Hence no commentary or meta text in the response.
- Structured, clear, and self-contained.
- **SOURCE ATTRIBUTION**: Include specific descriptive references with similarity percentages for all factual claims. Include customer names ONLY when available from the source data (e.g., "Our system provides advanced reporting capabilities (from our financial reporting response - 92% similarity)" or "with real-time dashboard features (from our analytics implementation for CustomerName - 95% similarity)" when customer name is available).
"""
    }
    
    # Format the previous responses for the prompt
    formatted_examples = ""
    if previous_responses and len(previous_responses) > 0:
        # Filter for 90%+ similarity only
        high_similarity_responses = [resp for resp in previous_responses if resp.get('similarity_score', 0) >= 0.9]
        
        for i, resp in enumerate(high_similarity_responses[:3], 1):  # Use up to 3 similar responses with 90%+ similarity
            score = resp.get('similarity_score', 0)
            if isinstance(score, str):
                try:
                    score = float(score)
                except:
                    score = 0
                    
            # Skip if similarity is below 90%
            if score < 0.9:
                continue
                    
            requirement_text = resp.get('requirement', '')
            response_text = resp.get('response', '')
            customer_name = resp.get('customer', '')
            
            # Create a short descriptive title from the requirement
            title_words = requirement_text.split()[:5]  # First 5 words
            short_title = ' '.join(title_words) + ('...' if len(title_words) >= 5 else '')
            
            # Include customer name in the source title if available
            customer_suffix = f" for {customer_name}" if customer_name else ""
            
            formatted_examples += f"**Source {i}: {short_title}{customer_suffix} (Similarity: {score:.2f})**:\n"
            formatted_examples += f"Original Requirement: {requirement_text}\n"
            formatted_examples += f"Previous Response: {response_text}\n"
            if customer_name:
                formatted_examples += f"Customer/Client: {customer_name}\n"
            formatted_examples += "\n"
    
    # Create user message with requirement and examples
    user_message = {
        "role": "user",
        "content": f"""You have the following previous responses with similarity scores to evaluate:

**Previous Responses and Scores**:
{formatted_examples}

**Instructions**:
1. **CRITICAL**: Use ONLY responses with 90% or higher similarity scores.
2. Analyze the responses, prioritizing those with higher scores for relevance.
3. Draft a response that meets all guidelines and rules outlined in the system message.
4. **CRITICAL**: For every feature, capability, or claim you mention, cite the specific source with its descriptive title and similarity percentage. Include customer names ONLY when available from the source data (e.g., "from Source 1: Audit Trail Implementation - 92% similarity" or "from Source 2: Role Access System for CustomerName - 95% similarity").
5. Ensure the response is clear, concise, and tailored to the given requirement.
6. If you cannot find supporting content in the sources for a claim, do NOT include that claim.

**Current Requirement**: {requirement}.
"""
    }
    
    # Add validation message as a final check
    validation_message = {
        "role": "user",
        "content": """Review and validate the draft response based on these criteria:
1. Content is derived solely from the provided previous responses.
2. The response is upto 200 words in length.
3. The tone is professional and business-focused.
4. No meta-text, assumptions, or speculative language is present.
5. The response delivers a clear, specific value proposition for the requirement.
6. **SOURCE VALIDATION**: Every factual claim includes a reference to the specific source with descriptive title and similarity percentage (90% or higher). Include customer names ONLY when available from the source data (e.g., "from Source 1: Audit Trail Implementation - 92% similarity").
7. **HALLUCINATION CHECK**: No content exists that cannot be traced back to the provided sources.

If any criteria are unmet, revise the response accordingly. Pay special attention to criteria 6 and 7 to prevent hallucination."""
    }
    
    # Create the full message array
    messages = [system_message, user_message, validation_message]
    
    # Print the full prompt for debugging
    prompt_preview = f"""
======== GENERATED PROMPT ========
SYSTEM: {system_message['content'][:200]}...
USER: {user_message['content'][:200]}...
VALIDATION: {validation_message['content'][:200]}...
================================
"""
    print(prompt_preview)
    logger.info(prompt_preview)
    
    return messages

def convert_prompt_to_claude(prompt: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert a standard prompt format to Claude-compatible format.

    Args:
        prompt: List of message dictionaries in standard format.

    Returns:
        List of message dictionaries in Claude format.
    """
    claude_messages = []
    system_message = ""

    # Extract system message if present
    for msg in prompt:
        if msg['role'] == 'system':
            system_message = msg['content']
            break

    # Convert messages
    for msg in prompt:
        if msg['role'] == 'system':
            continue  # Skip system messages as they're handled differently

        if msg['role'] == 'assistant':
            claude_messages.append({
                'role': 'assistant',
                'content': msg['content']
            })
        elif msg['role'] == 'user':
            # If there's a system message and this is the first user message,
            # prepend it to the content
            if system_message and not claude_messages:
                content = f"{system_message}\n\nHuman: {msg['content']}"
                claude_messages.append({
                    'role': 'user',
                    'content': content
                })
            else:
                claude_messages.append({
                    'role': 'user',
                    'content': msg['content']
                })

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