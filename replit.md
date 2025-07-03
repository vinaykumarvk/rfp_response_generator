# RFP Response Generator

## Overview

The RFP Response Generator is an advanced AI-powered application that leverages multi-model vector search and intelligent requirement matching to streamline proposal creation. This application combines React frontend with Express.js backend, PostgreSQL database with vector search capabilities, and integrates multiple AI models (OpenAI, Anthropic/Claude, DeepSeek) to generate high-quality RFP responses.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Tailwind CSS
- **UI Library**: Shadcn UI components for consistent design
- **State Management**: TanStack React Query for data fetching and caching
- **Build Tool**: Vite for fast development and optimized builds
- **Key Pages**: 
  - UploadRequirements.tsx for Excel file uploads
  - ViewData.tsx for requirement and response management

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints for data management and AI integration
- **Python Integration**: FastAPI for AI/ML processing and LLM interactions

### Database Architecture
- **Primary Database**: PostgreSQL with pgvector extension for vector similarity search
- **Schema Design**: Streamlined tables focusing on core functionality
  - `excel_requirement_responses`: Primary table for RFP requirements and responses
  - `reference_responses`: Reference information linked to requirements
  - `embeddings`: Vector embeddings for similarity search
  - `embedding_categories`: Categories for vector embeddings

## Key Components

### AI Model Integration
- **Multi-Model Support**: OpenAI GPT-4, Anthropic Claude, and DeepSeek models
- **MOA (Mixture of Agents)**: Advanced model synthesis for enhanced response quality
- **Vector Search**: PostgreSQL-based similarity matching for finding relevant previous responses
- **Prompt Engineering**: Sophisticated prompt generation for domain-specific RFP responses

### Data Processing Pipeline
- **Excel Upload**: Support for requirement import from Excel files
- **Batch Processing**: Generate responses for multiple requirements simultaneously
- **Response Management**: Edit, save, and export generated responses
- **Reference System**: Display similar questions and responses for context

### Export and Sharing
- **Multiple Formats**: Export to Markdown, Excel, and other formats
- **Email Integration**: SendGrid integration for sharing responses
- **WhatsApp Sharing**: Direct sharing capabilities
- **Print-ready Output**: Formatted responses for proposal submissions

## Data Flow

1. **Requirement Input**: Users upload Excel files containing RFP requirements
2. **Data Processing**: Requirements are parsed and stored in PostgreSQL database
3. **Vector Generation**: Embeddings are created for similarity search capabilities
4. **AI Processing**: When generating responses, the system:
   - Finds similar previous responses using vector search
   - Creates optimized prompts with domain-specific context
   - Calls selected AI models (OpenAI, Anthropic, or DeepSeek)
   - Synthesizes responses using MOA for enhanced quality
5. **Response Management**: Generated responses are stored and can be edited or exported
6. **Export Pipeline**: Responses can be exported in various formats or shared directly

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4 model integration for response generation
- **Anthropic API**: Claude model for alternative AI perspectives
- **DeepSeek API**: Additional AI model for response diversity

### Database Services
- **PostgreSQL**: Primary database with pgvector extension for vector operations
- **Drizzle Kit**: Database migrations and schema management

### Communication Services
- **SendGrid**: Email delivery for sharing responses
- **WhatsApp Business API**: Direct messaging integration

### Development Tools
- **Replit**: Primary development and hosting platform
- **GitHub**: Version control and collaboration

## Deployment Strategy

### Environment Configuration
- **Database**: PostgreSQL with automatic provisioning on Replit
- **Environment Variables**: Secure storage of API keys and configuration
- **Build Process**: Vite for frontend, esbuild for backend bundling

### Production Requirements
- **API Keys**: OpenAI, Anthropic, and DeepSeek API keys required for full functionality
- **Database**: PostgreSQL with pgvector extension
- **Runtime**: Node.js 20+ and Python 3.11+ environments

### Scalability Considerations
- **Database Optimization**: Streamlined schema with removed unused tables
- **Vector Search**: Efficient similarity matching with configurable parameters
- **Batch Processing**: Support for bulk operations to handle large RFP sets

## Recent Changes

### July 02, 2025 - Anti-Hallucination Enhancement with Similarity Percentages
- **Enhanced Prompt Structure**: Added mandatory source attribution requirements to prevent LLM hallucination
- **Descriptive Source Citations**: Replaced generic "Example 1" with descriptive titles like "Source 1: Audit Trail Implementation"
- **Similarity Percentage Integration**: All citations now include similarity percentages (e.g., "from Source 1: Audit Trail Implementation - 92% similarity")
- **Transparent Source Tracking**: Users can see exactly what previous responses are being referenced with their relevance scores
- **Strict Sourcing Constraints**: Added multiple validation layers requiring content to be traceable to provided examples
- **Hallucination Prevention**: Implemented comprehensive checks including SOURCE VALIDATION and HALLUCINATION CHECK in prompt validation
- **Content Rules**: Enhanced with MANDATORY reference requirements and STRICT SOURCING constraints
- **Output Requirements**: Added SOURCE ATTRIBUTION mandate with descriptive context and similarity percentages

### Key Anti-Hallucination Features Added:
1. **Content Rules**: MANDATORY citation of specific example numbers for all claims
2. **Critical Constraints**: STRICT SOURCING requirement - no content without example support  
3. **Output Requirements**: SOURCE ATTRIBUTION with example format guidance
4. **Instructions**: CRITICAL citation requirement in user instructions
5. **Validation**: SOURCE VALIDATION and HALLUCINATION CHECK in response review

## Changelog

```
Changelog:
- July 02, 2025. Enhanced prompts with source attribution to prevent hallucination
- July 02, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```