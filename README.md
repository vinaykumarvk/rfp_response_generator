# RFP Response Generator

An advanced AI-powered RFP Response Generator that transforms complex proposal creation into an intuitive, strategic experience through intelligent document processing and multi-model AI synthesis.

## Features

- **Excel Requirements Processing**: Upload and analyze Excel files containing RFP requirements
- **Multi-Model AI Integration**: Leverage OpenAI, Anthropic, and Deepseek for enhanced response generation
- **Mixture of Agents (MOA)**: Combine responses from multiple AI models for optimal results
- **Card-Based UI**: Responsive interface that works well on both desktop and mobile devices
- **Dark Mode Support**: Full theme support with dark and light modes
- **Reference Tracking**: Maintains relationships between generated responses and reference materials

## Technologies Used

- **Frontend**: React with TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js server with PostgreSQL database
- **AI Models**: OpenAI GPT-4o, Anthropic Claude, Deepseek
- **Data Processing**: Python with pandas, numpy, scikit-learn
- **Vector Embeddings**: Text embedding for semantic similarity search

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Python 3.10+
- API keys for OpenAI and Anthropic (optional)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/rfp_response_generator.git
   cd rfp_response_generator
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/rfp_db
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Initialize the database:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## Usage

1. **Upload Requirements**: Upload Excel files containing RFP requirements
2. **View Data**: Browse and search through uploaded requirements
3. **Generate Responses**: Select requirements and generate AI responses
4. **Edit & Export**: Modify generated responses and export to desired formats