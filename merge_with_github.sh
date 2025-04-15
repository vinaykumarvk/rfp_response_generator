#!/bin/bash

# Merge cleaned Replit project with GitHub repository
# Usage: ./merge_with_github.sh /path/to/github/repo

if [ -z "$1" ]; then
  echo "Error: GitHub repository path not provided!"
  echo "Usage: ./merge_with_github.sh /path/to/github/repo"
  exit 1
fi

GITHUB_REPO_PATH="$1"

if [ ! -d "$GITHUB_REPO_PATH" ]; then
  echo "Error: The provided GitHub repository path does not exist!"
  echo "Please clone the repository first:"
  echo "git clone https://github.com/vinaykumarvk/rfp_response_generator_clean.git"
  exit 1
fi

echo "Starting merge process with GitHub repository at: $GITHUB_REPO_PATH"
echo

# Create directory structure if it doesn't exist
echo "Creating directory structure..."
mkdir -p "$GITHUB_REPO_PATH/client/src/components"
mkdir -p "$GITHUB_REPO_PATH/client/src/hooks"
mkdir -p "$GITHUB_REPO_PATH/client/src/lib"
mkdir -p "$GITHUB_REPO_PATH/client/src/pages"
mkdir -p "$GITHUB_REPO_PATH/server"
mkdir -p "$GITHUB_REPO_PATH/shared"
mkdir -p "$GITHUB_REPO_PATH/attached_assets"
echo "Directory structure created."

# Copy core files
echo "Copying core files..."

# Python files
echo "Copying Python files..."
cp -v call_llm.py call_llm_simple.py database.py generate_prompt.py find_matches.py "$GITHUB_REPO_PATH/"
echo "Python files copied."

# Server files
echo "Copying server files..."
cp -v server/index.ts server/routes.ts server/storage.ts server/db.ts server/vite.ts "$GITHUB_REPO_PATH/server/"
cp -v server/field_mapping_fix.js server/field_mapping_fix.d.ts server/deployment_validator.py "$GITHUB_REPO_PATH/server/"
echo "Server files copied."

# Client files
echo "Copying client files..."
cp -rv client/src/components/* "$GITHUB_REPO_PATH/client/src/components/"
cp -rv client/src/hooks/* "$GITHUB_REPO_PATH/client/src/hooks/"
cp -rv client/src/lib/* "$GITHUB_REPO_PATH/client/src/lib/"
cp -rv client/src/pages/* "$GITHUB_REPO_PATH/client/src/pages/"
cp -v client/src/App.tsx client/src/main.tsx client/src/index.css "$GITHUB_REPO_PATH/client/src/"
cp -v client/index.html "$GITHUB_REPO_PATH/client/"
echo "Client files copied."

# Shared files
echo "Copying shared files..."
cp -v shared/schema.ts "$GITHUB_REPO_PATH/shared/"
echo "Shared files copied."

# Configuration files
echo "Copying configuration files..."
cp -v package.json postcss.config.js tailwind.config.ts theme.json tsconfig.json vite.config.ts drizzle.config.ts "$GITHUB_REPO_PATH/"
echo "Configuration files copied."

# Documentation files
echo "Copying documentation files..."
cp -v README.md ARCHITECTURE.md VERSION.md .env.example python-requirements.txt GITHUB_PREPARATION.md "$GITHUB_REPO_PATH/"
echo "Documentation files copied."

# Assets
echo "Copying attached assets..."
cp -v attached_assets/intellect_logo.png "$GITHUB_REPO_PATH/attached_assets/"
echo "Assets copied."

# Copy .gitignore
echo "Copying .gitignore..."
cp -v .gitignore "$GITHUB_REPO_PATH/"
echo ".gitignore copied."

# Create version information file with timestamp
echo "Creating version information file..."
VERSION_FILE="$GITHUB_REPO_PATH/VERSION_INFO.txt"
echo "RFP Response Generator v1.1" > "$VERSION_FILE"
echo "Updated: $(date)" >> "$VERSION_FILE"
echo "GitHub Repository: https://github.com/vinaykumarvk/rfp_response_generator_clean" >> "$VERSION_FILE"
echo "Version information file created at: $VERSION_FILE"

echo
echo "Merge completed! Files have been copied to: $GITHUB_REPO_PATH"
echo
echo "Next steps:"
echo "1. Navigate to the GitHub repository directory: cd $GITHUB_REPO_PATH"
echo "2. Review the changes: git status"
echo "3. Commit the changes: git add . && git commit -m \"Merge cleaned version 1.1 from Replit\""
echo "4. Push to GitHub: git push origin main"
echo
echo "Note: You may need to resolve conflicts if the same files exist in both repositories."