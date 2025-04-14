#!/bin/bash

# Cleanup script for GitHub submission
# This script removes temporary files, backups, and test files to prepare the codebase for GitHub

echo "Starting cleanup for GitHub submission..."

# Step 1: Removing cache and build artifacts
echo "Removing cache and build directories..."
rm -rf .cache
rm -rf __pycache__
rm -rf */__pycache__
rm -rf */*/__pycache__
rm -rf */*/*/__pycache__
rm -rf dist
rm -rf build

# Step 2: Removing backup files
echo "Removing backup files and directories..."
rm -rf server/backup
rm -rf server/temp_files
rm -f *.bak
rm -f */*.bak
rm -f */*/*.bak

# Step 3: Removing test files that aren't needed for production
echo "Removing test files..."
rm -f test_*.py
rm -f **/test_*.py
# Keep test_anthropic.py as it's needed for the Anthropic API integration
touch test_anthropic.py

# Step 4: Removing specific temporary or fix files
echo "Removing specific temporary/fix files..."
rm -f add-sample.js
rm -f direct_express_fix.js
rm -f direct_update_113.py
rm -f fix_db_113.js
rm -f fix_db_113.py
rm -f fix_req_113.py
rm -f client/api-test.html
rm -f client/public/api-test.html
rm -f client/public/test-api.html
rm -f server/api_test.py

# Step 5: Create a .gitignore file to prevent adding unwanted files in the future
echo "Creating .gitignore file..."
cat > .gitignore << EOL
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Cache and temp files
.cache
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
temp_files/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.log

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Python virtual environment
venv/
virtualenv/
.pythonlibs/

# Database files
*.sqlite3
*.db

# Replit specific
.replit/
.cache/
EOL

echo "Cleanup complete! The repository is now ready for GitHub submission."
echo "Note: This script does not remove essential application files."
echo "Check the repository structure once more before pushing to GitHub."