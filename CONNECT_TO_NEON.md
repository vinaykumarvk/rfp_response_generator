# Connecting to Neon Database

## Quick Setup

### Step 1: Get Your Neon DATABASE_URL

1. Go to your Neon dashboard: https://console.neon.tech/
2. Select your project
3. Go to "Connection Details" or "Connection String"
4. Copy the connection string (format: `postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`)

### Step 2: Update .env File

Edit `.env` and update the DATABASE_URL:

```bash
nano .env
```

Change this line:
```env
DATABASE_URL=postgresql://n15318@localhost:5432/rfp_response_generator
```

To your Neon URL:
```env
DATABASE_URL=postgresql://your-user:your-password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### Step 3: Test the Connection

```bash
source .venv/bin/activate
export $(cat .env | grep -v '^#' | xargs)
python3 test_neon_connection.py
```

### Step 4: Restart the Server

```bash
pkill -f "tsx server/index.ts"
export $(cat .env | grep -v '^#' | xargs)
npm run dev
```

## What Happens Automatically

The application will automatically:
- ✅ Detect Neon database (checks for `neon.tech` in URL)
- ✅ Use Neon serverless driver (already configured in `server/db.ts`)
- ✅ Connect via WebSocket (required for Neon)
- ✅ Access embeddings if they exist in Neon database

## Verification

After updating DATABASE_URL, you should see:
```
Using Neon serverless driver for cloud database
```

Instead of:
```
Using standard PostgreSQL driver for local database
```

## Testing Embeddings Access

Once connected to Neon:

```bash
source .venv/bin/activate
export $(cat .env | grep -v '^#' | xargs)
python3 -c "
from database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM embeddings'))
    print(f'Embeddings found: {result.fetchone()[0]}')
"
```

## Troubleshooting

### Connection Fails
- Verify DATABASE_URL is correct
- Check Neon dashboard - database should be running
- Ensure `?sslmode=require` is in the URL

### Still Using Local Database
- Check `.env` file has correct Neon URL
- Restart the server after updating `.env`
- Verify URL contains `neon.tech`

### No Embeddings Found
- Embeddings might not exist in Neon database yet
- You can generate them using `generate_embeddings.py`
- Or they may be in a different database

## Files Updated

- ✅ `server/db.ts` - Already configured to detect and use Neon
- ✅ `database.py` - Uses `create_engine(os.environ.get('DATABASE_URL'))` - works with Neon
- ✅ `test_neon_connection.py` - Test script to verify connection

