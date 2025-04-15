# Production Deployment Guide

This guide explains how to properly deploy the RFP Response Generator application to a production environment.

## Required Environment Variables

The application requires the following environment variables to be set in the production environment:

### Database Configuration
- `DATABASE_URL`: The PostgreSQL connection string (should be automatically provided by Replit)
- `PGHOST`: PostgreSQL host
- `PGPORT`: PostgreSQL port
- `PGUSER`: PostgreSQL username
- `PGPASSWORD`: PostgreSQL password
- `PGDATABASE`: PostgreSQL database name

### API Keys
The application needs the following API keys to function correctly:

- `OPENAI_API_KEY`: Your OpenAI API key for GPT models
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude models
- `DEEPSEEK_API_KEY`: Your DeepSeek API key

Without these API keys, the LLM functionality will not work correctly in production.

## Setting Environment Variables in Replit

To set environment variables in your Replit deployment:

1. Go to your Replit project
2. Click on the "Secrets" tab (lock icon) in the Tools panel
3. Add each required environment variable as a key-value pair
4. Click "Add new secret" for each environment variable

## Troubleshooting Missing API Keys

If you are experiencing issues with LLM functionality in production:

1. Check that all required API keys are set in the production environment
2. Verify the API keys are valid and have not expired
3. Use the `/api/validate-keys` endpoint to check which keys are available and which are missing
4. Check the server logs for specific error messages related to missing API keys

## Security Considerations

- Never commit API keys to version control
- Don't hard-code API keys in the application code
- Regularly rotate API keys as part of your security practices
- Use environment-specific configurations to separate development and production settings

## Environment Files

The application includes the following environment files:

- `.env.example`: Example configuration with placeholder values
- `.env.production`: Production environment configuration template 

When deploying to production, ensure that the actual API keys are set as environment variables rather than in the `.env.production` file.

## Testing Production Configuration

Before full deployment, you can test your production configuration by:

1. Temporarily setting the environment to production
2. Checking the `/api/validate-keys` endpoint
3. Testing a single LLM call to verify connectivity
4. Checking logs for any API key related errors