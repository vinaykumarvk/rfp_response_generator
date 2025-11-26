#!/bin/bash
# Quick script to update .env with Neon DATABASE_URL

if [ -z "$1" ]; then
    echo "Usage: ./update_neon_url.sh 'postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require'"
    exit 1
fi

NEON_URL="$1"

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update DATABASE_URL
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$NEON_URL|" .env
else
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEON_URL|" .env
fi

echo "✅ Updated .env with Neon DATABASE_URL"
echo ""
echo "Testing connection..."
source .venv/bin/activate
export $(cat .env | grep -v '^#' | xargs)
python3 test_neon_connection.py
