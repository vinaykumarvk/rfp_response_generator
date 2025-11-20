"""
Generate embeddings for requirements in the database
"""
import os
import sys
import json
import logging
from typing import List, Dict, Any
from openai import OpenAI
from database import engine
from sqlalchemy import text
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    def __init__(self, api_key: str):
        """Initialize the embedding generator with OpenAI API key"""
        self.client = OpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"  # Updated model for better performance
        
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text using OpenAI API
        
        Args:
            text: The text to generate embedding for
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    def generate_embedding_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in one API call (batch processing)
        
        Args:
            texts: List of texts to generate embeddings for
            
        Returns:
            List of embedding vectors
        """
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            raise
    
    def generate_embeddings_for_requirements(self, requirement_ids: Optional[List[int]] = None, batch_size: int = 100):
        """
        Generate and store embeddings for requirements using batch processing
        
        Args:
            requirement_ids: List of specific requirement IDs to process (None = all without embeddings)
            batch_size: Number of requirements to process per API call (OpenAI supports up to 2048)
            
        Returns:
            Dictionary with statistics about the process
        """
        stats = {
            'total_processed': 0,
            'total_created': 0,
            'total_skipped': 0,
            'errors': []
        }
        
        try:
            with engine.begin() as connection:  # Use begin() for transaction context
                # Get requirements that need embeddings (batch fetch)
                if requirement_ids:
                    query = text("""
                        SELECT r.id, r.requirement, r.category, r.final_response
                        FROM excel_requirement_responses r
                        LEFT JOIN embeddings e ON e.requirement = r.requirement
                        WHERE r.id = ANY(:ids) AND e.id IS NULL
                    """)
                    requirements = connection.execute(query, {"ids": requirement_ids}).fetchall()
                else:
                    query = text("""
                        SELECT r.id, r.requirement, r.category, r.final_response
                        FROM excel_requirement_responses r
                        LEFT JOIN embeddings e ON e.requirement = r.requirement
                        WHERE e.id IS NULL
                    """)
                    requirements = connection.execute(query).fetchall()
                
                logger.info(f"Found {len(requirements)} requirements to process")
                
                if len(requirements) == 0:
                    return stats
                
                # Process in batches for API efficiency
                for batch_start in range(0, len(requirements), batch_size):
                    batch = requirements[batch_start:batch_start + batch_size]
                    batch_end = min(batch_start + batch_size, len(requirements))
                    
                    logger.info(f"Processing batch {batch_start+1}-{batch_end} of {len(requirements)} requirements")
                    
                    try:
                        # Prepare batch data
                        batch_texts = []
                        batch_data = []
                        
                        for req in batch:
                            req_id, requirement_text, category, final_response = req
                            combined_text = f"{category} | {requirement_text}"
                            batch_texts.append(combined_text)
                            batch_data.append({
                                'id': req_id,
                                'requirement': requirement_text,
                                'category': category or 'General',
                                'response': final_response or ''
                            })
                        
                        # Generate all embeddings in one API call
                        logger.info(f"Calling OpenAI API for {len(batch_texts)} embeddings...")
                        embedding_vectors = self.generate_embedding_batch(batch_texts)
                        
                        # Bulk insert all embeddings
                        insert_query = text("""
                            INSERT INTO embeddings (
                                category, requirement, response, reference, 
                                payload, embedding
                            ) VALUES (
                                :category, :requirement, :response, :reference,
                                :payload, :embedding::vector
                            )
                        """)
                        
                        # Prepare bulk insert data
                        insert_data = []
                        for i, (data, embedding) in enumerate(zip(batch_data, embedding_vectors)):
                            vector_str = '[' + ','.join(map(str, embedding)) + ']'
                            metadata = {
                                'category': data['category'],
                                'source': 'uploaded_requirement'
                            }
                            
                            insert_data.append({
                                "category": data['category'],
                                "requirement": data['requirement'],
                                "response": data['response'],
                                "reference": f"REQ-{data['id']}",
                                "payload": json.dumps(metadata),
                                "embedding": vector_str
                            })
                        
                        # Execute bulk insert
                        connection.execute(insert_query, insert_data)
                        
                        # Transaction is auto-committed when exiting begin() context
                        
                        stats['total_created'] += len(batch)
                        stats['total_processed'] += len(batch)
                        logger.info(f"✓ Successfully created {len(batch)} embeddings")
                        
                        # Rate limiting between batches
                        if batch_end < len(requirements):
                            time.sleep(1)
                            
                    except Exception as e:
                        error_msg = f"Error processing batch {batch_start+1}-{batch_end}: {str(e)}"
                        logger.error(error_msg)
                        stats['errors'].append(error_msg)
                        stats['total_processed'] += len(batch)
                        continue
                
                logger.info(f"Embedding generation complete: {stats['total_created']} created, {stats['total_skipped']} skipped")
                return stats
                
        except Exception as e:
            logger.error(f"Fatal error in embedding generation: {str(e)}")
            stats['errors'].append(f"Fatal error: {str(e)}")
            return stats


def main():
    """Main function for command-line usage"""
    # Get API key from environment
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print(json.dumps({
            'success': False,
            'error': 'OPENAI_API_KEY not set in environment'
        }))
        sys.exit(1)
    
    # Get requirement IDs if provided
    requirement_ids = None
    if len(sys.argv) > 1:
        try:
            requirement_ids = [int(id) for id in sys.argv[1].split(',')]
        except ValueError:
            print(json.dumps({
                'success': False,
                'error': 'Invalid requirement IDs format. Use comma-separated integers.'
            }))
            sys.exit(1)
    
    # Generate embeddings
    generator = EmbeddingGenerator(api_key)
    stats = generator.generate_embeddings_for_requirements(requirement_ids)
    
    # Return results
    result = {
        'success': len(stats['errors']) == 0,
        'statistics': stats
    }
    
    print(json.dumps(result, indent=2))
    
    if not result['success']:
        sys.exit(1)


if __name__ == "__main__":
    main()
