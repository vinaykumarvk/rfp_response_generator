# LLM Response Generation Issues - Diagnosis & Solutions

## 🔍 Root Cause Analysis

### Issue 1: Invalid API Keys ❌
**Problem**: The `.env` file contains placeholder API keys (`test-openai`, `test-claude`, etc.) instead of real API keys.

**Error Message**:
```
Error code: 401 - Incorrect API key provided: test-openai
```

**Solution**: 
1. Edit `.env` file and replace placeholder keys with real API keys:
   ```bash
   nano .env
   ```

2. Update these values:
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
   ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key-here
   DEEPSEEK_API_KEY=your-actual-deepseek-key-here
   ```

3. Get your API keys from:
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys
   - DeepSeek: https://platform.deepseek.com/api_keys

### Issue 2: pgvector Extension Not Installed ❌
**Problem**: The pgvector extension is required for storing and searching vector embeddings, but it's not installed for PostgreSQL 16.

**Impact**: 
- Cannot store embeddings in the database
- Similarity search (finding similar past responses) won't work
- LLM responses can still work, but without context from similar responses

**Solution**: See `SETUP_PGVECTOR.md` for detailed instructions. Quick steps:
```bash
sudo mkdir -p /opt/homebrew/opt/postgresql@16/share/postgresql@16/extension
sudo ln -sf /opt/homebrew/share/postgresql@17/extension/vector* /opt/homebrew/opt/postgresql@16/share/postgresql@16/extension/
psql rfp_response_generator -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql rfp_response_generator -c "ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding vector(1536);"
```

### Issue 3: No Embeddings in Database ❌
**Problem**: The embeddings table is empty (0 embeddings).

**Impact**: 
- Cannot find similar past responses
- LLM responses won't have context from previous similar requirements

**Solution**: After fixing API keys and pgvector:
```bash
source .venv/bin/activate
export $(cat .env | grep -v '^#' | xargs)
python3 generate_embeddings.py
```

## ✅ Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database Connection | ✅ Working | Fixed with standard PostgreSQL driver |
| API Endpoints | ✅ Working | Requirements can be fetched |
| API Keys | ❌ Invalid | Using placeholder values |
| pgvector Extension | ❌ Not Installed | Needs manual setup (see SETUP_PGVECTOR.md) |
| Embeddings Table | ❌ Empty | Needs pgvector + valid API keys |
| LLM Responses | ❌ Failing | Returns simulated responses due to invalid API keys |

## 🚀 Quick Fix Steps

### Step 1: Update API Keys (Required)
```bash
# Edit .env file
nano .env

# Replace these lines with your real API keys:
OPENAI_API_KEY=sk-proj-your-real-key
ANTHROPIC_API_KEY=sk-ant-your-real-key
DEEPSEEK_API_KEY=your-real-key
```

### Step 2: Restart Server
```bash
pkill -f "tsx server/index.ts"
export $(cat .env | grep -v '^#' | xargs)
npm run dev
```

### Step 3: Test LLM Response (Without Embeddings)
```bash
# Test with skipSimilaritySearch=true
curl -X POST http://localhost:5000/api/generate-response \
  -H "Content-Type: application/json" \
  -d '{
    "requirementId": 2,
    "model": "openAI",
    "skipSimilaritySearch": true
  }'
```

### Step 4: Set Up pgvector (Optional but Recommended)
See `SETUP_PGVECTOR.md` for instructions. This enables:
- Storing embeddings for similarity search
- Finding similar past responses
- Better context for LLM responses

## 📝 Testing

After updating API keys, test the LLM response generation:

```bash
# Test OpenAI
curl -X POST http://localhost:5000/api/generate-response \
  -H "Content-Type: application/json" \
  -d '{"requirementId": 2, "model": "openAI", "skipSimilaritySearch": true}'

# Test Anthropic/Claude
curl -X POST http://localhost:5000/api/generate-response \
  -H "Content-Type: application/json" \
  -d '{"requirementId": 2, "model": "anthropic", "skipSimilaritySearch": true}'
```

## 🔧 Troubleshooting

### Still Getting Simulated Responses?
1. Check API keys are set: `echo $OPENAI_API_KEY`
2. Check server logs for errors
3. Verify API keys are valid by testing directly:
   ```bash
   python3 -c "from openai import OpenAI; client = OpenAI(); print('API key valid')"
   ```

### Embeddings Not Generating?
1. Ensure pgvector is installed (see SETUP_PGVECTOR.md)
2. Check API key is valid
3. Check Python can access environment variables:
   ```bash
   source .venv/bin/activate
   export $(cat .env | grep -v '^#' | xargs)
   python3 -c "import os; print(os.environ.get('OPENAI_API_KEY'))"
   ```

## 📚 Related Files

- `SETUP_PGVECTOR.md` - Instructions for installing pgvector
- `.env` - Environment variables (update with real API keys)
- `generate_embeddings.py` - Script to generate embeddings
- `call_llm.py` - Script to generate LLM responses

