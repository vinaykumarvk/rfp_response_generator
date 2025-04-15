# RFP Response Generator

An advanced AI-powered RFP Response Generator that leverages multi-model vector search and intelligent requirement matching to streamline proposal creation, with enhanced collaboration and adaptive learning capabilities.

## Features

- **Multi-Model AI Integration**: Uses OpenAI, Anthropic/Claude, and DeepSeek models to generate high-quality responses
- **Vector Search**: PostgreSQL vector search for finding similar requirements and previous responses
- **Requirement Management**: Upload, view, and manage RFP requirements from Excel files
- **Batch Processing**: Generate responses for multiple requirements at once
- **Reference Panel**: View similar questions and their responses for better context
- **Rich Export Options**: Export generated responses to various formats

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Express.js (Node.js) with TypeScript
- **Database**: PostgreSQL with pgvector extension for vector search
- **AI Models**: OpenAI (GPT-4), Anthropic (Claude), DeepSeek

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python 3.9+
- PostgreSQL with pgvector extension
- API keys for:
  - OpenAI
  - Anthropic
  - DeepSeek

### Environment Variables

Create a `.env` file with the following variables:

```
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/rfp_response_generator

# API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/rfp_response_generator.git
   cd rfp_response_generator
   ```

2. Install dependencies
   ```
   npm install
   pip install -r requirements.txt
   ```

3. Start the development server
   ```
   npm run dev
   ```

## Usage

1. **Upload Requirements**: Use the Upload Requirements page to import Excel files containing RFP requirements.
2. **View Requirements**: Navigate to the View Requirements page to see all imported requirements.
3. **Generate Responses**: Select one or more requirements and use the Generate Response options to create responses with your preferred AI model.
4. **View and Edit Responses**: Review generated responses, compare outputs from different models, and make edits as needed.
5. **Export**: Export your responses to various formats for inclusion in your proposal document.

## Core Workflows

### RFP Response Generation

1. Find similar matches to the current requirement
2. Store similar matches in the database
3. Call the selected LLM to generate a response based on the requirement and similar matches
4. Store the generated response in the database

## Code Structure

- `client/`: React frontend code
  - `src/components/`: UI components
  - `src/pages/`: Main application pages
  - `src/lib/`: Utility functions and types
  
- `server/`: Express.js backend code
  - `index.ts`: Server setup and configuration
  - `routes.ts`: API endpoints
  - `storage.ts`: Database operations
  
- `call_llm.py`: Python code for calling AI models
- `generate_prompt.py`: Prompt generation logic
- `database.py`: Database connection and utilities

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.