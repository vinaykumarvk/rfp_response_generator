# RFP Response Generator (v0.2)

An advanced AI-powered RFP Response Generator that transforms complex proposal creation through intelligent multi-model AI integration and robust API connectivity.

## Key Features

- **Multi-model AI integration**: Supports OpenAI, Anthropic, and Deepseek models for comprehensive response generation
- **Mixture of Agents (MOA)**: Combines responses from multiple AI models to create high-quality answers
- **Vector Embeddings**: Uses similarity search to find relevant previous responses
- **Excel Analysis**: Upload and analyze Excel files containing RFP requirements
- **Response Editing**: Edit and customize AI-generated responses
- **Batch Processing**: Generate responses for multiple requirements at once
- **Proper Markdown Rendering**: Enhanced display with ReactMarkdown and remark-gfm
- **Advanced Data Sorting**: Sort requirements by ID, date, RFP name, and category with visual indicators

## Tech Stack

- **Frontend**: React with TypeScript, TailwindCSS, and ShadCN UI components
- **Backend**: Express server with Python processing capabilities
- **Database**: PostgreSQL with Drizzle ORM
- **AI Models**: OpenAI, Anthropic Claude, and Deepseek
- **Vector Database**: In-memory vector store with similarity search

## Getting Started

1. Ensure you have the required environment variables:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (PostgreSQL connection string)

2. Start the application:
   ```
   npm run dev
   ```

3. Access the application at http://localhost:5000

## Architecture

The application follows a multi-tier architecture:

1. **React Frontend**: Handles user interface and interactions
2. **Express Backend**: Routes API requests and manages database operations
3. **Python Processing**: Generates embeddings and LLM responses
4. **PostgreSQL Database**: Stores requirements, responses, and references

## Usage

1. **Upload Requirements**: Use the Excel Analyzer to upload and process RFP requirements
2. **View Data**: Browse, filter, and sort uploaded requirements using the advanced data management features
   - **Filter**: Filter data by RFP name, category, response status, and generation model
   - **Sort**: Sort data by ID, date, RFP name, or category in ascending or descending order
   - **Select**: Choose multiple items for batch processing
3. **Generate Responses**: Select requirements and generate AI responses using different models
4. **Edit Responses**: Customize the generated responses as needed
5. **Export**: Export the final responses in the desired format

## Development

See the [VERSION.md](VERSION.md) file for a detailed changelog and development history.