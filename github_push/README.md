# RFP Response Generator v1.2

An advanced AI-powered RFP Response Generator that leverages multi-model vector search and intelligent requirement matching to streamline proposal creation.

## What's New in v1.2
- **Auto-refresh UI after response generation**: Immediate UI update after generating a response without requiring manual refresh
- **Improved API key validation and error handling**: Better detection and reporting of missing API keys
- **Fixed critical bugs in ReferencePanel**: Resolved JSON parsing and AbortController errors
- **Enhanced production deployment documentation**: Detailed setup instructions for production environment

## Key Features
- React frontend with TypeScript for a modern and responsive UI
- Python backend for AI processing with fastAPI for API endpoints
- PostgreSQL vector search for intelligent requirement matching
- Multi-AI model integration (OpenAI, Anthropic/Claude, Deepseek, MOA)
- Advanced requirement navigation and reference tracking
- Performance-optimized export and sharing utilities

## System Requirements
- Node.js 20+
- Python 3.11+
- PostgreSQL database with pgvector extension

## Environment Variables
The application requires the following environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for OpenAI model responses
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude model responses
- `DEEPSEEK_API_KEY`: DeepSeek API key for DeepSeek model responses

## Setup Instructions
1. Clone the repository
2. Run `npm install` to install JavaScript dependencies
3. Run `pip install -r requirements.txt` to install Python dependencies
4. Set up the required environment variables
5. Run `npm run dev` to start the development server