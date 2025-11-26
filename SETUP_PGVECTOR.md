# Setting Up pgvector Extension

## Issue
The pgvector extension is required for storing and searching vector embeddings, but it's not currently installed for PostgreSQL 16.

## Solution

You need to manually install pgvector for PostgreSQL 16. Here are the steps:

### Option 1: Install pgvector for PostgreSQL 16 (Recommended)

1. **Create the extension directory:**
   ```bash
   sudo mkdir -p /opt/homebrew/opt/postgresql@16/share/postgresql@16/extension
   ```

2. **Create symlinks to pgvector files:**
   ```bash
   sudo ln -sf /opt/homebrew/share/postgresql@17/extension/vector* /opt/homebrew/opt/postgresql@16/share/postgresql@16/extension/
   ```

3. **Verify the files are linked:**
   ```bash
   ls -la /opt/homebrew/opt/postgresql@16/share/postgresql@16/extension/ | grep vector
   ```

4. **Create the extension in your database:**
   ```bash
   psql rfp_response_generator -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

5. **Add the vector column to embeddings table:**
   ```bash
   psql rfp_response_generator -c "ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding vector(1536);"
   ```

6. **Create an index for efficient similarity search:**
   ```bash
   psql rfp_response_generator -c "CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"
   ```

### Option 2: Upgrade to PostgreSQL 17 (Alternative)

If you prefer, you can upgrade to PostgreSQL 17 which has pgvector support:

```bash
brew install postgresql@17
brew services stop postgresql@16
brew services start postgresql@17
createdb rfp_response_generator
# Then run: npm run db:push
```

## After Installation

Once pgvector is set up:

1. **Generate embeddings for your requirements:**
   ```bash
   source .venv/bin/activate
   export $(cat .env | grep -v '^#' | xargs)
   python3 generate_embeddings.py
   ```

2. **Or generate embeddings for specific requirements:**
   ```bash
   python3 generate_embeddings.py 1,2,3
   ```

## Current Status

- ✅ pgvector package is installed (v0.8.1)
- ❌ Extension not linked to PostgreSQL 16
- ❌ Vector column not added to embeddings table
- ❌ No embeddings in database

## Note

The application can still generate LLM responses without embeddings, but similarity search (finding similar past responses) won't work until embeddings are set up.

