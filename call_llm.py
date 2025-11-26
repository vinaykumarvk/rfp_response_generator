import os
from openai import OpenAI
from anthropic import Anthropic
from sqlalchemy import text
from database import engine
from generate_prompt import create_rfp_prompt, convert_prompt_to_claude, find_similar_matches_and_generate_prompt
import logging
import traceback

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
    print(f"\n==== EXTRACT_TEXT DEBUG ====")
    print(f"Input response type: {type(response)}")
    print(f"Input response repr: {repr(response)[:150]}...")
    
    # Handle direct string
    if isinstance(response, str):
        print(f"EXTRACT_TEXT: Response is already a string of length {len(response)}")
        print(f"EXTRACT_TEXT: String sample: {response[:100]}...")
        print(f"==== END EXTRACT_TEXT DEBUG ====\n")
        return response
        
    # Handle content attribute (new Anthropic API)
    if hasattr(response, 'content'):
        print(f"EXTRACT_TEXT: Response has content attribute")
        print(f"EXTRACT_TEXT: Content type: {type(response.content)}")
        
        if isinstance(response.content, list):
            print(f"EXTRACT_TEXT: Content is a list of length {len(response.content)}")
            print(f"EXTRACT_TEXT: First item type: {type(response.content[0]) if response.content else 'N/A'}")
            
            # Handle TextBlock objects
            try:
                # First try to extract using specific API structure
                result = ' '.join(block.text for block in response.content if hasattr(block, 'text'))
                print(f"EXTRACT_TEXT: Joined text blocks, result length: {len(result)}")
                print(f"EXTRACT_TEXT: Result sample: {result[:100]}...")
                if result:
                    print(f"==== END EXTRACT_TEXT DEBUG ====\n")
                    return result
            except Exception as e:
                print(f"EXTRACT_TEXT: Error extracting from content list: {str(e)}")
            
            # If that fails, try alternative extraction methods
            try:
                # For Claude API v3+, try to extract content from the first item if it's a dict with 'text'
                if response.content and isinstance(response.content[0], dict) and 'text' in response.content[0]:
                    result = response.content[0]['text']
                    print(f"EXTRACT_TEXT: Extracted text from content[0]['text'], length: {len(result)}")
                    print(f"EXTRACT_TEXT: Result sample: {result[:100]}...")
                    print(f"==== END EXTRACT_TEXT DEBUG ====\n")
                    return result
            except Exception as e:
                print(f"EXTRACT_TEXT: Error with alternative extraction: {str(e)}")
                
            # Last fallback for content list
            try:
                content_str = str(response.content)
                print(f"EXTRACT_TEXT: Converting content list to string, length: {len(content_str)}")
                print(f"EXTRACT_TEXT: Content string sample: {content_str[:100]}...")
                print(f"==== END EXTRACT_TEXT DEBUG ====\n")
                return content_str
            except Exception as e:
                print(f"EXTRACT_TEXT: Error converting content list to string: {str(e)}")
            
        elif isinstance(response.content, str):
            print(f"EXTRACT_TEXT: Content is a string of length {len(response.content)}")
            print(f"EXTRACT_TEXT: String sample: {response.content[:100]}...")
            print(f"==== END EXTRACT_TEXT DEBUG ====\n")
            return response.content
            
        else:
            # Try as string anyway
            print(f"EXTRACT_TEXT: Content is of type {type(response.content)}")
            print(f"EXTRACT_TEXT: Converting to string: {str(response.content)[:100]}...")
            print(f"==== END EXTRACT_TEXT DEBUG ====\n")
            return str(response.content)
            
    # Handle direct TextBlock object
    if hasattr(response, 'text'):
        print(f"EXTRACT_TEXT: Response has text attribute")
        print(f"EXTRACT_TEXT: Text length: {len(response.text)}")
        print(f"EXTRACT_TEXT: Text sample: {response.text[:100]}...")
        print(f"==== END EXTRACT_TEXT DEBUG ====\n")
        return response.text
    
    # Try common properties for modern Claude API
    if hasattr(response, 'message') and hasattr(response.message, 'content'):
        print(f"EXTRACT_TEXT: Found response.message.content")
        try:
            content = response.message.content
            if isinstance(content, list) and content and hasattr(content[0], 'text'):
                result = content[0].text
                print(f"EXTRACT_TEXT: Extracted from message.content[0].text, length: {len(result)}")
                print(f"EXTRACT_TEXT: Result sample: {result[:100]}...")
                print(f"==== END EXTRACT_TEXT DEBUG ====\n")
                return result
        except Exception as e:
            print(f"EXTRACT_TEXT: Error extracting from message.content: {str(e)}")
    
    # Try other common properties
    for attr in ['message', 'choices', 'result', 'output']:
        if hasattr(response, attr):
            print(f"EXTRACT_TEXT: Response has {attr} attribute")
            attr_value = getattr(response, attr)
            print(f"EXTRACT_TEXT: {attr} type: {type(attr_value)}")
            print(f"EXTRACT_TEXT: {attr} repr: {repr(attr_value)[:100]}...")
            
            # If we have choices, try to extract content from there (common in API responses)
            if attr == 'choices' and isinstance(attr_value, list) and attr_value:
                try:
                    choice = attr_value[0]
                    if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                        content = choice.message.content
                        print(f"EXTRACT_TEXT: Found content in choices[0].message.content: {content[:100]}...")
                        print(f"==== END EXTRACT_TEXT DEBUG ====\n")
                        return content
                except Exception as e:
                    print(f"EXTRACT_TEXT: Error extracting from choices: {str(e)}")
        
    # Last resort fallback
    result = str(response)
    print(f"EXTRACT_TEXT: Using last resort fallback")
    print(f"EXTRACT_TEXT: Fallback result length: {len(result)}")
    print(f"EXTRACT_TEXT: Fallback sample: {result[:100]}...")
    print(f"==== END EXTRACT_TEXT DEBUG ====\n")
    return result

def get_model_config(model_name):
    """
    Return configuration for a specific model.
    
    Args:
        model_name: The name of the model to get configuration for
        
    Returns:
        dict: Model configuration including API details
    """
    # Standardize model name to ensure consistent handling
    normalized_name = model_name.lower()
    
    # Map claude to anthropic for standardization
    if normalized_name == 'claude':
        normalized_name = 'anthropic'
    
    # Configuration map for supported models
    model_configs = {
        'openai': {
            'display_name': 'OpenAI',
            'client_class': OpenAI,
            'client_args': {
                'api_key': os.environ.get("OPENAI_API_KEY"),
            },
            'client_kwargs': {},
            'completion_args': {
                'model': 'gpt-5.1',
                'temperature': 0.2
            },
            'requires_system_message_handling': False,
            'use_responses_api': True,  # Use Responses API for GPT-4.1
            'response_handler': lambda response: response.output_text.strip() if hasattr(response, 'output_text') else str(response)
        },
        'deepseek': {
            'display_name': 'DeepSeek',
            'client_class': OpenAI,
            'client_args': {
                'api_key': os.environ.get("DEEPSEEK_API_KEY"),
                'base_url': "https://api.deepseek.com/v1",
            },
            'client_kwargs': {},
            'completion_args': {
                'model': 'deepseek-chat',
                'temperature': 0.2
            },
            'requires_system_message_handling': False,
            'response_handler': lambda response: response.choices[0].message.content.strip()
        },
        'anthropic': {
            'display_name': 'Anthropic',
            'client_class': Anthropic,
            'client_args': {
                'api_key': os.environ.get("ANTHROPIC_API_KEY"),
            },
            'client_kwargs': {},
            'completion_args': {
                'model': "claude-sonnet-4-5",
                'max_tokens': 4000,
                'temperature': 0.2
            },
            'requires_system_message_handling': True,
            'response_handler': extract_text
        }
    }
    
    # Return the configuration for the requested model
    if normalized_name in model_configs:
        config = model_configs[normalized_name]
        # Add the normalized name to the config
        config['normalized_name'] = normalized_name
        return config
    else:
        raise ValueError(f"Unsupported model: {model_name}")

def prompt_gpt(prompt, model_name='openAI'):
    """
    Generic function to prompt any supported LLM.
    
    Args:
        prompt: The prompt to send to the LLM
        model_name: The name of the model to use (e.g., 'openAI', 'anthropic', 'deepseek')
        
    Returns:
        str: The model's response
    """
    try:
        # Get the configuration for the specified model
        config = get_model_config(model_name)
        normalized_name = config['normalized_name']
        display_name = config['display_name']
        
        logger.info(f"Calling {display_name} API with prompt")
        
        # Validate API key before initializing client
        api_key = config['client_args'].get('api_key')
        if not api_key:
            raise ValueError(f"{display_name} API key not found in environment variables. Please set {display_name.upper()}_API_KEY")
        
        # Initialize the client with the configuration
        try:
            client = config['client_class'](**config['client_args'], **config.get('client_kwargs', {}))
            logger.info(f"{display_name} client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize {display_name} client: {str(e)}")
            raise ValueError(f"Failed to initialize {display_name} client: {str(e)}")
        
        # Handle system message for models that require it separately
        if config['requires_system_message_handling']:
            # Default system message
            system_message = "All responses and data must be treated as private and confidential. Do not use for training or any other purpose."
            
            # Extract system message from prompt if present
            for msg in prompt:
                if msg.get('role') == 'system':
                    system_message = msg.get('content', system_message)
                    break
            
            # Filter out system messages for the messages parameter
            messages = [msg for msg in prompt if msg.get('role') != 'system']
            
            print(f"======= {display_name.upper()} PROMPT =======")
            print(f"System: {system_message[:200]}...")
            print(f"Messages: {str(messages)[:200]}...")
            print("===============================")
            
            # Create the completion with the system message handled separately
            completion_args = config['completion_args'].copy()
            completion_args['messages'] = messages
            completion_args['system'] = system_message
            
            logger.info(f"Calling {display_name} API with model: {completion_args.get('model')}, messages: {len(messages)}, system message length: {len(system_message)}")
            try:
                response = client.messages.create(**completion_args)
                logger.info(f"{display_name} API call successful, response type: {type(response)}")
            except Exception as e:
                logger.error(f"{display_name} API call failed: {str(e)}")
                logger.error(f"Completion args: {completion_args}")
                raise
        else:
            # Check if this model uses the new Responses API (e.g., GPT-5)
            if config.get('use_responses_api', False):
                # Use the new Responses API
                completion_args = config['completion_args'].copy()
                # Convert messages format to input format for Responses API
                completion_args['input'] = prompt
                
                print(f"======= {display_name.upper()} PROMPT (Responses API) =======")
                print(f"Input: {str(prompt)[:200]}...")
                print("===============================")
                
                logger.info(f"Calling {display_name} Responses API with model: {completion_args.get('model')}")
                try:
                    response = client.responses.create(**completion_args)
                    logger.info(f"{display_name} Responses API call successful, response type: {type(response)}")
                except Exception as e:
                    logger.error(f"{display_name} Responses API call failed: {str(e)}")
                    logger.error(f"Completion args: {completion_args}")
                    raise
            else:
                # Standard completion for models that use chat.completions API (e.g., DeepSeek)
                completion_args = config['completion_args'].copy()
                completion_args['messages'] = prompt
                
                logger.info(f"Calling {display_name} chat.completions API with model: {completion_args.get('model')}, messages: {len(prompt)}")
                try:
                    response = client.chat.completions.create(**completion_args)
                    logger.info(f"{display_name} chat.completions API call successful, response type: {type(response)}")
                except Exception as e:
                    logger.error(f"{display_name} chat.completions API call failed: {str(e)}")
                    logger.error(f"Completion args keys: {list(completion_args.keys())}")
                    logger.error(f"Model: {completion_args.get('model')}, Messages count: {len(prompt)}")
                    raise
        
        # Handle the response using the model-specific handler
        try:
            content = config['response_handler'](response)
            logger.info(f"{display_name} response handler executed successfully, content type: {type(content)}")
        except Exception as e:
            logger.error(f"{display_name} response handler failed: {str(e)}")
            logger.error(f"Response type: {type(response)}, Response: {str(response)[:500]}")
            raise ValueError(f"Failed to extract content from {display_name} response: {str(e)}")
        
        # Log the response for debugging
        print(f"====== FULL {display_name.upper()} RESPONSE ======")
        if not isinstance(content, str):
            print(f"Type: {type(response)}")
            print(f"Response object: {response}")
            print(f"Extracted content: {content}")
            logger.warning(f"{display_name} response handler returned non-string: {type(content)}")
        else:
            print(f"Content preview: {content[:200]}...")
        print("=======================================")
        
        # Validate and clean up the content
        if isinstance(content, str):
            content = content.strip()
            if not content:
                logger.warning(f"{display_name} response is empty after stripping")
                print(f"WARNING: Empty response from {display_name}, using fallback content")
                return f"The system encountered an issue with the {display_name} response. Please try again or use another model."
            
            logger.info(f"Successfully generated {display_name} response of length: {len(content)} characters")
            return content
        else:
            logger.error(f"{display_name} response handler did not return a string, got: {type(content)}")
            raise ValueError(f"{display_name} response handler returned invalid type: {type(content)}")
            
    except Exception as e:
        logger.error(f"Error generating response from {model_name}: {str(e)}")
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

def get_llm_responses(requirement_id, model='moa', display_results=True, skip_similarity_search=False):
    """
    Get LLM responses for a given requirement.

    Args:
        requirement_id: ID of the requirement to process
        model: Model to use ('openAI', 'deepseek', 'anthropic'/'claude', or 'moa')
               If 'moa', responses from all models will be synthesized
        display_results: Whether to display the results after fetching
        skip_similarity_search: If True, skips finding similar matches and uses existing ones in the database
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

            # Check if we should skip similarity search and use existing matches
            similar_results = []
            if skip_similarity_search:
                print("\n=== Using Existing Similar Questions ===")
                print("Skip similarity search flag is set - using existing similar questions")
                # Get existing similar questions from the database
                existing_similar_query = text("""
                    SELECT similar_questions
                    FROM excel_requirement_responses
                    WHERE id = :req_id
                """)
                
                try:
                    existing_similar = connection.execute(existing_similar_query, {"req_id": requirement_id}).fetchone()
                    if existing_similar and existing_similar[0]:
                        print("Found existing similar questions in database")
                        # Parse the existing similar questions string back to a list
                        import ast
                        similar_questions_list = ast.literal_eval(existing_similar[0])
                        
                        print(f"DEBUG: Similar questions loaded from database (first example): {similar_questions_list[0] if similar_questions_list else 'None'}")
                        
                        # We'll set similar_questions_list later, but we need similar_results format for prompt creation
                        for idx, sq in enumerate(similar_questions_list):
                            similar_results.append([
                                idx,                          # id
                                sq['question'],               # matched_requirement
                                sq['response'],               # matched_response
                                "",                           # category
                                float(sq['similarity_score'])  # similarity_score
                            ])
                        print(f"Converted {len(similar_questions_list)} existing similar questions for use")
                        
                        # Debug - print the first similar result for verification
                        if similar_results:
                            print(f"DEBUG: First similar result converted format:")
                            print(f"  ID: {similar_results[0][0]}")
                            print(f"  Question: {similar_results[0][1][:50]}...")
                            print(f"  Response: {similar_results[0][2][:50]}...")
                            print(f"  Score: {similar_results[0][4]}")
                    else:
                        print("No existing similar questions found - will perform search anyway")
                        skip_similarity_search = False  # Force search if no existing data
                except Exception as e:
                    print(f"Error retrieving existing similar questions: {str(e)}")
                    print(f"Exception traceback: {traceback.format_exc()}")
                    skip_similarity_search = False  # Force search if error occurs
            
            # If not skipping or if retrieving existing failed, perform similarity search
            if not skip_similarity_search:
                # Use the proper find_similar_matches function that extracts customer names
                try:
                    from find_matches import find_similar_matches
                    
                    print("2. Calling find_similar_matches to get proper customer names...")
                    matches_result = find_similar_matches(requirement_id)
                    
                    if matches_result.get('success') and matches_result.get('similar_matches'):
                        # Convert the matches to the format expected by the rest of the code
                        similar_results = []
                        for match in matches_result['similar_matches']:
                            similar_results.append([
                                match['id'],
                                match['requirement'],
                                match['response'],
                                match.get('category', ''),
                                match.get('customer', ''),  # Customer name extracted by find_matches
                                match['similarity_score']
                            ])
                        print(f"Retrieved {len(similar_results)} similar questions with customer data")
                    else:
                        print("Warning: No similar questions found")
                        similar_results = []
                except Exception as e:
                    print(f"Warning: Error fetching similar questions: {str(e)}")
                    print(f"Exception traceback: {traceback.format_exc()}")
                    similar_results = []

            # Format previous responses and similar questions
            previous_responses = []
            similar_questions_list = []
            for idx, result in enumerate(similar_results, 1):
                # Handle both old format (tuple with 5 items) and new format (tuple with 6 items including customer)
                if len(result) >= 6:
                    # New format from find_similar_matches with customer data
                    requirement_text = result[1]
                    response_text = result[2]
                    customer_name = result[4]  # Customer name
                    similarity = result[5]     # Similarity score
                else:
                    # Old format (backward compatibility)
                    requirement_text = result[1]
                    response_text = result[2]
                    customer_name = ""
                    similarity = result[4] if len(result) > 4 else 0.0
                
                # Format the similar questions for the prompt in the expected dictionary format
                previous_responses.append({
                    "requirement": requirement_text,
                    "response": response_text,
                    "customer": customer_name,
                    "similarity_score": similarity
                })
                
                # Format similar questions for API response and database storage
                similar_questions_list.append({
                    "question": requirement_text,
                    "response": response_text,
                    "reference": f"Response #{idx}",
                    "customer": customer_name,  # Include customer name in stored data
                    "similarity_score": f"{similarity:.4f}"
                })
                
            print(f"Found {len(previous_responses)} similar questions")

            # Generate prompts based on model
            if model == 'moa':
                print("3. Generating responses from all models")
                print("\n=== Prompt Creation Debug ===")
                print(f"Creating prompt with: requirement text (length {len(requirement[1])}), category: '{requirement[2]}', and {len(previous_responses)} similar responses")
                
                # Debug - show the first previous response if available
                if previous_responses:
                    print(f"First previous response data sample:")
                    print(f"  Requirement: {previous_responses[0]['requirement'][:50]}..." if len(previous_responses[0]['requirement']) > 50 else previous_responses[0]['requirement'])
                    print(f"  Response: {previous_responses[0]['response'][:50]}..." if len(previous_responses[0]['response']) > 50 else previous_responses[0]['response'])
                    print(f"  Similarity: {previous_responses[0]['similarity_score']}")

                # Generate responses from all models
                openai_prompt = create_rfp_prompt(requirement[1], requirement[2], previous_responses)
                print(f"OpenAI prompt created - Contains {len(openai_prompt)} message objects")
                
                claude_prompt = convert_prompt_to_claude(openai_prompt)
                print(f"Claude prompt created - Contains {len(claude_prompt)} message objects")

                # Use a dictionary to store model responses
                model_responses = {}
                
                # Define the models to use
                models = [
                    {'name': 'openai', 'prompt': openai_prompt},
                    {'name': 'deepseek', 'prompt': openai_prompt},
                    {'name': 'anthropic', 'prompt': claude_prompt}
                ]
                
                # Get responses from each model
                for model_info in models:
                    model_name = model_info['name']
                    model_prompt = model_info['prompt']
                    
                    try:
                        print(f"Generating response from {model_name}...")
                        model_responses[model_name] = prompt_gpt(model_prompt, model_name)
                        print(f"Successfully generated {model_name} response")
                    except Exception as e:
                        print(f"Error generating {model_name} response: {str(e)}")
                        model_responses[model_name] = None
                
                # Assign responses to variables for backward compatibility
                openai_response = model_responses.get('openai')
                deepseek_response = model_responses.get('deepseek')
                claude_response = model_responses.get('anthropic')

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
                        # Use openai for synthesis by default
                        print("Generating synthesized (MOA) response...")
                        final_response = prompt_gpt(synthesis_prompt, 'openai')
                        print(f"Successfully generated synthesized response of length: {len(final_response)}")
                    except Exception as e:
                        print(f"Error generating synthesized response: {str(e)}")
                        # Fallback to the best available individual response
                        final_response = openai_response or deepseek_response or claude_response
                        print(f"Using fallback response of length: {len(final_response) if final_response else 0}")
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
                print("\n=== Single Model Prompt Creation Debug ===")
                print(f"Creating prompt with: requirement text (length {len(requirement[1])}), category: '{requirement[2]}', and {len(previous_responses)} similar responses")
                
                # Debug - show the first previous response if available
                if previous_responses:
                    print(f"First previous response data sample:")
                    print(f"  Requirement: {previous_responses[0]['requirement'][:50]}..." if len(previous_responses[0]['requirement']) > 50 else previous_responses[0]['requirement'])
                    print(f"  Response: {previous_responses[0]['response'][:50]}..." if len(previous_responses[0]['response']) > 50 else previous_responses[0]['response'])
                    print(f"  Similarity: {previous_responses[0]['similarity_score']}")
                
                # Generate prompt based on the model
                try:
                    # Get model config to check if it's Anthropic/Claude
                    config = get_model_config(model)
                    normalized_model = config['normalized_name']
                    print(f"Model '{model}' normalized to '{normalized_model}'")
                    
                    # Claude/Anthropic uses a different prompt format
                    if normalized_model == 'anthropic':
                        print("Using Claude-specific prompt format")
                        prompt = convert_prompt_to_claude(create_rfp_prompt(requirement[1], requirement[2], previous_responses))
                    else:
                        print(f"Using standard prompt format for {normalized_model}")
                        prompt = create_rfp_prompt(requirement[1], requirement[2], previous_responses)
                except ValueError:
                    # Handle non-standard models (like 'moa')
                    print(f"Model '{model}' not recognized, using standard prompt format")
                    prompt = create_rfp_prompt(requirement[1], requirement[2], previous_responses)
                
                print(f"Prompt created - Contains {len(prompt)} message objects")

                try:
                    print(f"Calling LLM API for {model}...")
                    response = prompt_gpt(prompt, model)
                    print(f"LLM API call for {model} successful, response length: {len(response)} characters")
                    # Print first 100 chars of the response for debugging
                    print(f"Response preview: {response[:100]}...")
                except Exception as e:
                    print(f"ERROR: Failed to call LLM API for {model}")
                    raise ValueError(f"Error generating response from {model}: {str(e)}")

                # Save response to database
                print("4. Saving response to database")
                
                # Get the normalized model name using our config function
                try:
                    config = get_model_config(model)
                    normalized_model = config['normalized_name']
                except ValueError:
                    # Fallback for 'moa' which doesn't have a specific config
                    normalized_model = model.lower()
                
                print(f"Original model: '{model}', Normalized model: '{normalized_model}'")
                
                save_query = text("""
                    UPDATE excel_requirement_responses
                    SET 
                        openai_response = CASE WHEN :normalized_model = 'openai' THEN :response ELSE openai_response END,
                        deepseek_response = CASE WHEN :normalized_model = 'deepseek' THEN :response ELSE deepseek_response END,
                        anthropic_response = CASE WHEN :normalized_model = 'anthropic' THEN :response ELSE anthropic_response END,
                        final_response = :response,  -- For individual models, copy response to final_response
                        similar_questions = :similar_questions,
                        model_provider = :normalized_model,
                        timestamp = NOW()
                    WHERE id = :req_id
                """)

                print(f"Executing database update with model: {normalized_model}")
                connection.execute(save_query, {
                    "req_id": requirement_id,
                    "response": response,
                    "normalized_model": normalized_model,
                    "similar_questions": str(similar_questions_list)
                })
                
                # Log what was updated for debugging
                print(f"Updated {normalized_model}_response column and final_response with response length: {len(response)}")
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
    # Default to not skipping similarity search
    skip_similarity_search = len(sys.argv) > 4 and sys.argv[4].lower() == 'true'

    get_llm_responses(requirement_id, model, display_results, skip_similarity_search)