# RFP Response Generator: Architecture and Workflow

This document outlines the architecture and workflow of the RFP Response Generator application.

## Overall Architecture

The application follows a client-server architecture:

```
+---------------+         +---------------+         +---------------+
|               |         |               |         |               |
|   React UI    | <-----> |  Express API  | <-----> |  PostgreSQL   |
|   (Frontend)  |         |  (Backend)    |         |  Database     |
|               |         |               |         |               |
+---------------+         +-------+-------+         +---------------+
                                 |
                                 v
                          +---------------+
                          |               |
                          |    AI APIs    |
                          | (OpenAI, etc) |
                          |               |
                          +---------------+
```

## Component Breakdown

### Frontend (React with TypeScript)

The frontend is organized into:

- **Pages**:
  - `UploadRequirements.tsx`: Handles Excel file uploads with requirements
  - `ViewData.tsx`: Displays requirements and responses with filtering capabilities

- **Components**:
  - UI components (using Shadcn UI library)
  - `ReferencePanel.tsx`: Shows similar questions and responses
  - Various utility and layout components

### Backend (Express.js with TypeScript)

- **Server Setup**: `server/index.ts`
- **API Routes**: `server/routes.ts`
- **Database Operations**: `server/storage.ts`

### Python ML/AI Components

- **LLM Integration**: `call_llm.py`
- **Prompt Engineering**: `generate_prompt.py`
- **Database Connection**: `database.py`

### Database (PostgreSQL)

- Uses pgvector extension for vector similarity search
- Stores requirements, responses, and embeddings

## Main Workflows

### 1. Excel Requirements Upload

```
+---------------+       +---------------+       +---------------+
|   Excel File  | ----> | Parse & Format| ----> |  Store in DB  |
|   Upload      |       |   Data        |       |               |
+---------------+       +---------------+       +---------------+
```

1. User uploads Excel file with requirements
2. Backend parses and validates the Excel data
3. Requirements are stored in the database with metadata

### 2. Response Generation

```
+-----------------+       +-------------------+       +----------------+
| Select          | ----> | Fetch Similar     | ----> | Generate Prompt|
| Requirement     |       | Questions/Answers |       |                |
+-----------------+       +-------------------+       +----------------+
        |                                                     |
        v                                                     v
+----------------+       +-------------------+       +----------------+
| Store Generated| <---- | Process Response  | <---- | Call AI Model  |
| Response in DB |       |                   |       | (Selected)     |
+----------------+       +-------------------+       +----------------+
```

1. User selects a requirement to generate a response for
2. Backend fetches similar questions from the database using vector search
3. System generates a prompt based on the requirement and similar questions
4. The prompt is sent to the selected AI model (OpenAI, Anthropic, or DeepSeek)
5. The generated response is processed and stored in the database
6. UI updates to show the generated response

### 3. Vector Similarity Search

```
+----------------+       +-------------------+       +----------------+
| Requirement    | ----> | Convert to Vector | ----> | Find Similar   |
| Text           |       | Embedding         |       | Vectors in DB  |
+----------------+       +-------------------+       +----------------+
```

1. The system uses embeddings to find semantically similar requirements
2. These similar requirements help provide context for the AI models
3. The similarity score is calculated to rank the most relevant previous responses

## Data Flow

### Request Processing Pipeline

1. **Frontend Request**: UI sends a request to generate a response for a requirement
2. **Backend Coordination**: Express server handles the request, calling Python scripts
3. **AI Processing**: Python scripts call the selected AI API with appropriate prompts
4. **Database Updates**: Generated response is stored in the database
5. **Response Delivery**: Result is returned to the frontend

### Database Schema

The PostgreSQL database contains the following key tables:

- **excel_requirement_responses**: Stores the requirements and responses
- **embeddings**: Stores vector embeddings for semantic search

## Technologies Used

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: PostgreSQL with pgvector extension
- **AI Providers**: OpenAI (GPT-4), Anthropic (Claude), DeepSeek
- **Vector Search**: PostgreSQL pgvector for similarity search

## Performance Considerations

- Batch processing is implemented to handle multiple requirements
- Progress indicators show the status of long-running operations
- AI calls are made sequentially to avoid rate limiting
- Vector search is optimized with pgvector indexing