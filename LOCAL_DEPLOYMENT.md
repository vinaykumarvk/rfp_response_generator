# Local Deployment Guide

## ✅ Deployment Status

The RFP Response Generator application has been successfully deployed locally!

## 🚀 Access the Application

- **Frontend**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health
- **API Base URL**: http://localhost:5000/api

## 📋 What Was Set Up

### 1. Dependencies Installed
- **Node.js dependencies**: All npm packages installed (640 packages)
- **Python dependencies**: All Python packages installed in virtual environment (`.venv/`)

### 2. Database Configuration
- **PostgreSQL Server**: Started (PostgreSQL 16 via Homebrew)
- **Database Created**: `rfp_response_generator`
- **Schema Applied**: Database tables created using Drizzle ORM:
  - `excel_requirement_responses`
  - `reference_responses`
  - `embeddings`

### 3. Environment Variables
The following environment variables are configured:
- `DATABASE_URL`: `postgresql://n15318@localhost:5432/rfp_response_generator`
- `OPENAI_API_KEY`: Set (placeholder: `test-openai`)
- `ANTHROPIC_API_KEY`: Set (placeholder: `test-claude`)
- `DEEPSEEK_API_KEY`: Set (placeholder: `test-deepseek`)
- `SENDGRID_API_KEY`: Set (placeholder: `test-sendgrid`)

**Note**: Replace placeholder API keys with real keys for full functionality.

## 🎮 Running the Application

### Start the Server

The server is currently running in the background. To start it manually:

```bash
./start_server.sh
```

Or manually:
```bash
export DATABASE_URL="postgresql://n15318@localhost:5432/rfp_response_generator"
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export DEEPSEEK_API_KEY="your-deepseek-key"
export SENDGRID_API_KEY="your-sendgrid-key"

npm run dev
```

### Stop the Server

Find and kill the process:
```bash
ps aux | grep "tsx server/index.ts" | grep -v grep
kill <PID>
```

Or use:
```bash
pkill -f "tsx server/index.ts"
```

## 🗄️ Database Management

### Connect to Database
```bash
psql rfp_response_generator
```

### View Tables
```bash
psql rfp_response_generator -c '\dt'
```

### Stop PostgreSQL Service
```bash
brew services stop postgresql@16
```

### Start PostgreSQL Service
```bash
brew services start postgresql@16
```

## 🔧 Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express.js (Node.js) + TypeScript
- **Database**: PostgreSQL 16 with pgvector extension
- **ORM**: Drizzle ORM
- **Python**: FastAPI for LLM integration
- **AI Models**: OpenAI, Anthropic/Claude, DeepSeek

## 📝 Next Steps

1. **Set Real API Keys**: Replace placeholder API keys with actual keys in your environment
2. **Upload Requirements**: Use the Upload Requirements page to import Excel files
3. **Generate Responses**: Select requirements and generate responses using your preferred AI model
4. **View Responses**: Navigate to View Requirements to see all imported requirements and generated responses

## 🐛 Troubleshooting

### Server Not Starting
- Check if PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL is set: `echo $DATABASE_URL`
- Check for port conflicts: `lsof -i :5000`

### Database Connection Issues
- Ensure PostgreSQL is running: `brew services list | grep postgresql`
- Verify database exists: `psql -l | grep rfp_response_generator`
- Check connection: `psql rfp_response_generator -c 'SELECT 1'`

### Python Scripts Not Working
- Activate virtual environment: `source .venv/bin/activate`
- Verify Python packages: `pip list`
- Test database connection: `python database.py`

## 📚 Additional Resources

- See `README.md` for full application documentation
- See `ARCHITECTURE.md` for system architecture details
- See `PRODUCTION_DEPLOYMENT.md` for production deployment guide

