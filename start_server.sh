#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found. Using default values or system environment variables."
    echo "Copy .env.example to .env and configure your settings."
fi

# Start the server
echo "Starting RFP Response Generator server..."
echo "Database URL: ${DATABASE_URL:-not set}"
echo "Server will be available at http://localhost:5000"
npm run dev

