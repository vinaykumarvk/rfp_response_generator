#!/usr/bin/env python3
import os
import sys
import json
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import openai

# Configure the API keys
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
EMBEDDING_FILE_PATH = os.path.join(os.path.dirname(__file__), "rfp_embeddings.pkl")

def load_embeddings():
    """Load embeddings from the local file."""
    try:
        print(f"Loading embeddings from {EMBEDDING_FILE_PATH}...")
        with open(EMBEDDING_FILE_PATH, 'rb') as f:
            data = pickle.load(f)
        print(f"Embeddings loaded successfully!")
        return data
    except Exception as e:
        print(f"Error loading embeddings: {str(e)}")
        return None

def get_embedding(text):
    """Get embedding for text using OpenAI API."""
    if not OPENAI_API_KEY:
        print("OpenAI API key not found")
        return None
        
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        
        return np.array(response.data[0].embedding)
    except Exception as e:
        print(f"Error getting embedding: {str(e)}")
        return None

def find_similar(query_text, embeddings_data, k=3):
    """Find similar requirements based on query."""
    query_embedding = get_embedding(query_text)
    if query_embedding is None:
        return []
        
    points = embeddings_data.get('points', [])
    results = []
    
    for point in points:
        point_vector = np.array(point['vector'])
        payload = point['payload']
        
        # Calculate similarity
        similarity = cosine_similarity([query_embedding], [point_vector])[0][0]
        
        if similarity >= 0.3:  # Threshold
            results.append({
                'text': payload.get('text', ''),
                'score': float(similarity),
                'category': payload.get('category', ''),
                'requirement': payload.get('requirement', ''),
                'response': payload.get('response', '')
            })
    
    # Sort by similarity score
    results.sort(key=lambda x: x['score'], reverse=True)
    
    return results[:k]

def generate_response(query_text, similar_responses):
    """Generate response using OpenAI."""
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        # Construct the prompt
        prompt = f"""You are an expert RFP response assistant. Generate a response to this requirement:

Requirement: {query_text}

Here are some examples of similar requirements and their responses:
"""
        
        # Add similar responses to the prompt
        for i, resp in enumerate(similar_responses, 1):
            prompt += f"""
Example {i}:
- Requirement: {resp['requirement']}
- Response: {resp['response']}
"""
        
        prompt += """
Using the examples provided, generate a comprehensive response to the original requirement.
"""
        
        # Call the OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert RFP response assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 simple_generate.py 'requirement text'")
        sys.exit(1)
        
    requirement = sys.argv[1]
    print(f"Processing requirement: {requirement}")
    
    # Load embeddings
    embeddings_data = load_embeddings()
    if embeddings_data is None:
        print("Failed to load embeddings")
        sys.exit(1)
        
    # Find similar requirements
    print("Finding similar requirements...")
    similar = find_similar(requirement, embeddings_data)
    
    if not similar:
        print("No similar requirements found")
        sys.exit(1)
        
    print(f"Found {len(similar)} similar requirements")
    
    # Generate response
    print("Generating response...")
    response = generate_response(requirement, similar)
    
    if response:
        print("\n=== Generated Response ===")
        print(response)
    else:
        print("Failed to generate response")