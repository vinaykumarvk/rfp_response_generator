# RFP Response Generator

An advanced AI-powered RFP Response Generator leveraging multi-model vector search and intelligent requirement matching to streamline proposal creation.

## Key Technologies

- React frontend with TypeScript
- Python backend for AI processing
- PostgreSQL vector search with advanced similarity matching
- Multi-AI model integration (OpenAI, Anthropic, Deepseek)
- Automated response generation with contextual reference lookup

## Architecture Overview

The application uses a comprehensive multi-page approach with:

1. **PostgreSQL Vector Database**
   - Uses pgvector extension for efficient similarity search
   - 9,658 requirement embeddings stored as vectors
   - Optimized IVFFLAT indexing for performance

2. **AI Response Generation**
   - MOA (Mixture of Agents) approach with multiple models
   - OpenAI, Anthropic, and Deepseek integration
   - Two-phase generation with final synthesis

3. **Export Capabilities**
   - Print functionality with markdown formatting
   - Email functionality with SendGrid
   - Excel export with clean formatting

## Vector Search Implementation

The application uses PostgreSQL with pgvector extension for efficient similarity search instead of loading embeddings into memory:

- **Embedding Storage**: All 9,658 embeddings are stored in the database
- **Search Optimization**: Uses cosine similarity with IVFFLAT indexing
- **Performance**: Efficient queries with proper index optimization

## Key Features

- Upload Excel requirements and display content
- Store data in PostgreSQL database (parent-child relationships)
- Generate AI-powered responses with multiple models
- Edit generated responses with version tracking
- Process multiple requirements with progress tracking
- Export selected requirements and responses
- Rate responses with feedback system

## Development Setup

1. **Prerequisites**
   - PostgreSQL database with pgvector extension
   - Node.js and npm
   - Python 3.11+
   - API keys for OpenAI, Anthropic, and DeepSeek

2. **Environment Variables**
   - `DATABASE_URL`: PostgreSQL connection string
   - `OPENAI_API_KEY`: OpenAI API key
   - `ANTHROPIC_API_KEY`: Anthropic API key
   - `DEEPSEEK_API_KEY`: DeepSeek API key
   - `SENDGRID_API_KEY`: (Optional) SendGrid API key for email functionality

3. **Running the Application**
   - Start the development server with: `npm run dev`

## Database Schema

The PostgreSQL database includes these key tables:

1. **embeddings**: Stores requirement embeddings for vector search
   - Uses pgvector's vector data type for the embedding field
   - Includes category, requirement, response, and reference fields

2. **responses**: Stores generated responses with model-specific fields
   - `finalResponse`: The final synthesized response
   - `openaiResponse`, `anthropicResponse`, `deepseekResponse`: Model-specific responses
   - `moaResponse`: Mixture of Agents synthesized response
   - `feedback`: User feedback on response quality

## Vector Search Implementation

The application has migrated from loading a large pickle file (135MB) into memory to using PostgreSQL's pgvector extension for more efficient similarity search:

- All 9,658 embeddings are stored in the database
- Vector similarity search uses cosine distance with proper normalization
- Optimized IVFFLAT index with vector_cosine_ops for performance
- Text search capabilities for keyword queries