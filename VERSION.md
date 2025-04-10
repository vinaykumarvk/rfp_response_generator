# RFP Response Generator - Version History

## Version 0.1 - April 10, 2025

### Core Features
- Multi-model AI response generation (OpenAI, Anthropic, Deepseek)
- Excel requirements analysis and storage
- Relational database structure with proper parent-child relationships
- Response editing capability for customizing AI-generated content
- Batch processing with real-time progress tracking

### Recent Improvements
- Fixed parameter passing between Node.js and Python script to resolve "Unsupported model provider" error
- Added Raw Output tab to the LlmResponseViewer component for better debugging
- Implemented proper markdown rendering using ReactMarkdown and remark-gfm plugins
- Enhanced Similar Questions cards with:
  - Category in bold at the top
  - Cleaner display of scores and references
  - Collapsible responses with toggle buttons
- Fixed string escape sequence issues and Unicode character rendering

### UI Components
- Dedicated pages for uploading requirements, viewing data, and generating responses
- LLM Response Viewer with three tabs (Final Response, Similar Questions, Raw Output)
- Enhanced markdown formatting for headers, lists, and special characters
- Collapsible similar responses with toggle functionality

### Database Structure
- Parent-child relationship between responses and reference information
- Model-specific response columns (openAIResponse, anthropicResponse, deepseekResponse)
- Proper foreign key relationships with cascade delete behavior

### API Connectivity
- Confirmed successful connectivity to OpenAI and Anthropic APIs
- Multiple testing methods implemented (terminal, web interface)