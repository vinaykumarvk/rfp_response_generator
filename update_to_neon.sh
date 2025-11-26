#!/bin/bash
# Script to update DATABASE_URL to Neon

echo "Updating .env to use Neon database..."
echo ""
echo "Please enter your Neon DATABASE_URL:"
echo "Format: postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"
echo ""
read -p "Neon DATABASE_URL: " NEON_URL

if [ -z "$NEON_URL" ]; then
    echo "Error: DATABASE_URL cannot be empty"
    exit 1
fi

# Backup current .env
cp .env .env.local.backup

# Update DATABASE_URL in .env
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$NEON_URL|" .env
else
    # Linux
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEON_URL|" .env
fi

echo ""
echo "✅ Updated .env with Neon DATABASE_URL"
echo ""
echo "To test the connection, run:"
echo "  source .venv/bin/activate"
echo "  export \$(cat .env | grep -v '^#' | xargs)"
echo "  python3 database.py"
