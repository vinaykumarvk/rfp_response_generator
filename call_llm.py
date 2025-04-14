import os
from openai import OpenAI
from anthropic import Anthropic
from sqlalchemy import text
from database import engine
from generate_prompt import create_rfp_prompt, convert_prompt_to_claude, find_similar_matches_and_generate_prompt
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def extract_text(response):
    """
    Extract clean text from Claude's TextBlock response.

    Args:
        response: Response object from Claude API

    Returns:
        str: Clean text without TextBlock wrapper
    """
    # Handle direct string
    if isinstance(response, str):
        return response
        
    # Handle content attribute (new Anthropic API)
    if hasattr(response, 'content'):
        if isinstance(response.content, list):
            # Handle TextBlock objects
            return ' '.join(block.text for block in response.content if hasattr(block, 'text'))
        elif isinstance(response.content, str):
            return response.content
        else:
            # Try as string anyway
            return str(response.content)
            
    # Handle direct TextBlock object
    if hasattr(response, 'text'):
        return response.text
        
    # Last resort fallback
    return str(response)

def prompt_gpt(prompt, llm='openAI'):
    try:
        if llm == 'openAI':
            logger.info(f"Calling OpenAI API with prompt: {prompt}")
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
            # Log the actual response content for debugging
            print("====== FULL OPENAI RESPONSE ======")
            print(content)
            print("==================================")
            logger.info(f"Successfully generated response of length: {len(content)} characters")
            return content

        elif llm == 'deepseek':
            logger.info(f"Calling DeepSeek API with prompt: {prompt}")
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
            # Log the actual response content for debugging
            print("====== FULL DEEPSEEK RESPONSE ======")
            print(content)
            print("===================================")
            logger.info(f"Successfully generated response of length: {len(content)} characters")
            return content

        elif llm == 'claude':
            logger.info(f"Calling Claude API with prompt: {prompt}")
            client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            
            # The system message should be passed separately for Claude
            system_message = "All responses and data must be treated as private and confidential. Do not use for training or any other purpose."
            
            # Extract system message from prompt if present
            for msg in prompt:
                if msg.get('role') == 'system':
                    system_message = msg.get('content', system_message)
                    break
            
            # Filter out system messages for the messages parameter
            messages = [msg for msg in prompt if msg.get('role') != 'system']
            
            print("======= CLAUDE PROMPT =======")
            print(f"System: {system_message[:200]}...")
            print(f"Messages: {str(messages)[:200]}...")
            print("============================")
            
            response = client.messages.create(
                model="claude-3-7-sonnet-20250219",  # Using the latest Claude model
                max_tokens=4000,
                temperature=0.2,
                messages=messages,
                system=system_message
            )
            
            # Use our extract_text function to handle all response formats
            content = extract_text(response)
            
            # Log the actual response content for debugging
            print("====== FULL CLAUDE RESPONSE ======")
            print(content)
            print("=================================")
            logger.info(f"Successfully generated Claude response of length: {len(content)} characters")
            return content

    except Exception as e:
        logger.error(f"Error generating response from {llm}: {str(e)}")
        raise

def create_synthesized_response_prompt(requirement, responses):
    """
    Generate a prompt to synthesize multiple RFP responses into a cohesive, impactful response.

    Args:
        requirement: The specific RFP requirement to address.
        responses: List of individual responses to evaluate and synthesize.

    Returns:
        List of messages for the LLM.
    """
    system_message = {
        "role": "system",
        "content": f"""You are a senior RFP specialist at a leading financial technology company with 15+ years of experience in winning complex RFPs in the wealth management domain.

OBJECTIVE:
Synthesize multiple response versions into one optimal response that directly addresses the requirement: {requirement}

EVALUATION CRITERIA:
1. **Relevance & Impact**:
   - Direct alignment with the requirement.
   - Clear and compelling value proposition.
   - Focus on business benefits and measurable outcomes.
   - Practicality of implementation.

2. **Content Quality**:
   - Factual accuracy (use ONLY information from provided responses).
   - Specific examples, capabilities, and competitive differentiators.
   - Avoid abstract claims; focus on concrete, verifiable details.

3. **Writing Standards**:
   - Professional, concise, and accessible language.
   - Use active voice and avoid unnecessary technical jargon.
   - Ensure clarity and logical flow.

SYNTHESIS RULES:
1. **Structure**:
   - Begin with the strongest capability or feature.
   - Support with specific examples, features, or metrics.
   - Conclude with a clear statement of business impact or value proposition.

2. **Content Integration**:
   - Merge overlapping points to eliminate redundancy.
   - Resolve contradictions by prioritizing the most relevant or impactful information.
   - Maintain consistent terminology and preserve specific metrics or numbers.

3. **Strict Prohibitions**:
   - Do NOT include content beyond the provided source responses.
   - Avoid marketing language, superlatives, or conditional statements.
   - Do NOT add implementation details unless explicitly requested.

OUTPUT REQUIREMENTS:
1. **Format**:
   - Single cohesive response, approximately 200 words.
   - Ready for direct submission without additional editing.

2. **Must Exclude**:
   - Meta-commentary, introductory phrases, or explanatory notes.
   - References to the synthesis process or source responses.

3. **Must Include**:
   - Concrete capabilities and specific benefits.
   - A clear, compelling value proposition tailored to the requirement."""
    }

    user_message = {
        "role": "user",
        "content": f"""REQUIREMENT TO ADDRESS:
{requirement}

SOURCE RESPONSES TO SYNTHESIZE:
{responses}

SYNTHESIS PROCESS:
1. **Analysis Phase**:
   - Review all responses to identify key themes, unique value points, and overlapping content.

2. **Integration Phase**:
   - Select the strongest elements from each response.
   - Merge complementary points and remove redundancies.
   - Ensure the response has a logical flow and aligns with the requirement.

3. **Refinement Phase**:
   - Verify alignment with the requirement.
   - Check for completeness, clarity, and adherence to the 200-word limit.

4. **Validation Phase**:
   - Cross-check the response against the source material to ensure no new information is added.
   - Confirm the tone is professional and the focus is on business benefits.

Now, provide the synthesized response that best addresses the requirement."""
    }

    validation_message = {
        "role": "user",
        "content": """FINAL CHECKS:
1. Does the response directly and fully address the requirement?
2. Is all information sourced exclusively from the provided responses?
3. Is the response approximately 200 words in length?
4. Is the language clear, professional, and free of unnecessary jargon?
5. Does the response include concrete capabilities, specific benefits, and a clear value proposition?
6. Is the response ready for direct submission without additional editing?

If any check fails, revise the response accordingly."""
    }

    return [system_message, user_message, validation_message]

def get_llm_responses(requirement_id, model='moa', display_results=True):
    """
    Get LLM responses for a given requirement.

    Args:
        requirement_id: ID of the requirement to process
        model: Model to use ('openAI', 'deepseek', 'claude', or 'moa')
               If 'moa', responses from all models will be synthesized
        display_results: Whether to display the results after fetching
    """
    print(f"\n\n==== RESPONSE GENERATION PROCESS ====")
    print(f"Processing requirement ID: {requirement_id}")
    print(f"Selected model: {model}")
    print(f"====================================\n")
    try:
        print("\n=== Database Operations ===")
        # First, get the requirement details and generate prompts
        with engine.connect() as connection:
            # Get requirement details
            req_query = text("""
                SELECT r.id, r.requirement, r.category
                FROM excel_requirement_responses r
                WHERE r.id = :req_id
            """)
            requirement = connection.execute(req_query, {"req_id": requirement_id}).fetchone()

            if not requirement:
                raise ValueError(f"No requirement found with ID: {requirement_id}")

            print("1. Retrieved requirement details from database")

            # Find similar matches and generate prompts
            similar_query = text("""
                WITH requirement_embedding AS (
                    SELECT embedding 
                    FROM embeddings 
                    WHERE requirement = (
                        SELECT requirement 
                        FROM excel_requirement_responses 
                        WHERE id = :req_id
                    )
                    LIMIT 1
                )
                SELECT 
                    e.id,
                    e.requirement as matched_requirement,
                    e.response as matched_response,
                    e.category,
                    CASE 
                        WHEN re.embedding IS NOT NULL AND e.embedding IS NOT NULL 
                        THEN 1 - (e.embedding <=> re.embedding)
                        ELSE 0.0
                    END as similarity_score
                FROM embeddings e
                CROSS JOIN requirement_embedding re
                WHERE e.embedding IS NOT NULL
                ORDER BY similarity_score DESC
                LIMIT 5;
            """)

            try:
                similar_results = connection.execute(similar_query, {"req_id": requirement_id}).fetchall()
                print("2. Retrieved similar questions from database")

                if not similar_results:
                    print("Warning: No similar questions found")
                    similar_results = []
            except Exception as e:
                print(f"Warning: Error fetching similar questions: {str(e)}")
                similar_results = []

            # Format previous responses and similar questions
            previous_responses = []
            similar_questions_list = []
            for idx, result in enumerate(similar_results, 1):
                # Format the similar questions for the prompt in the expected dictionary format
                previous_responses.append({
                    "requirement": result[1],  # matched_requirement
                    "response": result[2],     # matched_response
                    "similarity_score": result[4]  # similarity_score as float
                })
                
                # Format similar questions for API response and database storage
                similar_questions_list.append({
                    "question": result[1],
                    "response": result[2],
                    "reference": f"Response #{idx}",
                    "similarity_score": f"{result[4]:.4f}"
                })
                
            print(f"Found {len(previous_responses)} similar questions")

            # Generate prompts based on model
            if model == 'moa':
                print("3. Generating responses from all models")
                # Generate responses from all models
                openai_prompt = create_rfp_prompt(requirement[1], requirement[2], previous_responses)
                claude_prompt = convert_prompt_to_claude(openai_prompt)

                try:
                    openai_response = prompt_gpt(openai_prompt, 'openAI')
                except Exception as e:
                    print(f"Error generating OpenAI response: {str(e)}")
                    openai_response = None

                try:
                    deepseek_response = prompt_gpt(openai_prompt, 'deepseek')
                except Exception as e:
                    print(f"Error generating Deepseek response: {str(e)}")
                    deepseek_response = None

                try:
                    claude_response = prompt_gpt(claude_prompt, 'claude')
                except Exception as e:
                    print(f"Error generating Claude response: {str(e)}")
                    claude_response = None

                # Create synthesized prompt
                if any([openai_response, deepseek_response, claude_response]):
                    responses_to_synthesize = []
                    if openai_response:
                        responses_to_synthesize.append(f"OpenAI Response:\n{openai_response}")
                    if deepseek_response:
                        responses_to_synthesize.append(f"Deepseek Response:\n{deepseek_response}")
                    if claude_response:
                        responses_to_synthesize.append(f"Claude Response:\n{claude_response}")

                    synthesis_prompt = create_synthesized_response_prompt(requirement[1], "\n\n".join(responses_to_synthesize))
                    try:
                        final_response = prompt_gpt(synthesis_prompt, 'openAI')
                    except Exception as e:
                        print(f"Error generating synthesized response: {str(e)}")
                        final_response = openai_response or deepseek_response or claude_response
                else:
                    raise ValueError("Failed to generate responses from any model")

                # Save responses to database
                print("4. Saving responses to database")
                save_query = text("""
                    UPDATE excel_requirement_responses
                    SET 
                        openai_response = :openai_response,
                        deepseek_response = :deepseek_response,
                        anthropic_response = :anthropic_response,
                        final_response = :final_response,
                        similar_questions = :similar_questions,
                        model_provider = :model_provider,
                        timestamp = NOW()
                    WHERE id = :req_id
                """)

                connection.execute(save_query, {
                    "req_id": requirement_id,
                    "openai_response": openai_response,
                    "deepseek_response": deepseek_response,
                    "anthropic_response": claude_response,
                    "final_response": final_response,
                    "similar_questions": str(similar_questions_list),
                    "model_provider": model
                })
                connection.commit()
                print("5. Responses saved successfully")

            else:
                print(f"3. Generating response from {model}")
                # Generate response from specific model
                if model == 'claude':
                    prompt = convert_prompt_to_claude(create_rfp_prompt(requirement[1], requirement[2], previous_responses))
                else:
                    prompt = create_rfp_prompt(requirement[1], requirement[2], previous_responses)

                try:
                    response = prompt_gpt(prompt, model)
                except Exception as e:
                    raise ValueError(f"Error generating response from {model}: {str(e)}")

                # Save response to database
                print("4. Saving response to database")
                save_query = text("""
                    UPDATE excel_requirement_responses
                    SET 
                        openai_response = CASE WHEN :model = 'openAI' THEN :response ELSE openai_response END,
                        deepseek_response = CASE WHEN :model = 'deepseek' THEN :response ELSE deepseek_response END,
                        anthropic_response = CASE WHEN :model = 'claude' THEN :response ELSE anthropic_response END,
                        final_response = :response,
                        similar_questions = :similar_questions,
                        model_provider = :model,
                        timestamp = NOW()
                    WHERE id = :req_id
                """)

                connection.execute(save_query, {
                    "req_id": requirement_id,
                    "model": model,
                    "response": response,
                    "similar_questions": str(similar_questions_list)
                })
                connection.commit()
                print("5. Response saved successfully")

            if display_results:
                # Display results
                print("\n=== Results ===")
                print(f"Requirement: {requirement[1]}")
                print(f"Category: {requirement[2]}")
                print("\nSimilar Questions:")
                for q in similar_questions_list:
                    print(f"- {q['question']} (Similarity: {q['similarity_score']})")
                print("\nFinal Response:")
                print(final_response if model == 'moa' else response)

    except Exception as e:
        print(f"\nError in get_llm_responses: {str(e)}")
        raise

if __name__ == "__main__":
    # Example usage with model selection
    import sys

    # Get requirement ID and model from command line arguments
    requirement_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    model = sys.argv[2] if len(sys.argv) > 2 else 'moa'
    display_results = len(sys.argv) <= 3 or sys.argv[3].lower() != 'false'

    get_llm_responses(requirement_id, model, display_results)