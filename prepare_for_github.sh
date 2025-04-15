#!/bin/bash

# Prepare essential files for GitHub v1.1
echo "Preparing essential files for GitHub version 1.1..."

# Create a directory for the GitHub-ready files
GITHUB_DIR="rfp_response_generator_v1.1_github_ready"
rm -rf "$GITHUB_DIR"
mkdir -p "$GITHUB_DIR"

# Create essential directory structure
mkdir -p "$GITHUB_DIR/client/src/components"
mkdir -p "$GITHUB_DIR/client/src/hooks"
mkdir -p "$GITHUB_DIR/client/src/lib"
mkdir -p "$GITHUB_DIR/client/src/pages"
mkdir -p "$GITHUB_DIR/server"
mkdir -p "$GITHUB_DIR/shared"
mkdir -p "$GITHUB_DIR/attached_assets"

# Copy essential files

# Python files
cp -v call_llm.py call_llm_simple.py database.py generate_prompt.py find_matches.py "$GITHUB_DIR/"

# Server files
cp -v server/index.ts server/routes.ts server/storage.ts server/db.ts server/vite.ts "$GITHUB_DIR/server/"
cp -v server/field_mapping_fix.js server/field_mapping_fix.d.ts "$GITHUB_DIR/server/"

# Client files
cp -rv client/src/components/* "$GITHUB_DIR/client/src/components/"
cp -rv client/src/hooks/* "$GITHUB_DIR/client/src/hooks/"
cp -rv client/src/lib/* "$GITHUB_DIR/client/src/lib/"
cp -rv client/src/pages/* "$GITHUB_DIR/client/src/pages/"
cp -v client/src/App.tsx client/src/main.tsx client/src/index.css "$GITHUB_DIR/client/src/"
cp -v client/index.html "$GITHUB_DIR/client/"

# Shared files
cp -v shared/schema.ts "$GITHUB_DIR/shared/"

# Configuration files
cp -v package.json postcss.config.js tailwind.config.ts theme.json tsconfig.json vite.config.ts drizzle.config.ts "$GITHUB_DIR/"

# Documentation files
cp -v README.md ARCHITECTURE.md VERSION.md .env.example python-requirements.txt "$GITHUB_DIR/"

# Assets
cp -v attached_assets/intellect_logo.png "$GITHUB_DIR/attached_assets/"

# Create version info file
echo "Creating version information file..."
VERSION_FILE="$GITHUB_DIR/VERSION_INFO.txt"
echo "RFP Response Generator v1.1" > "$VERSION_FILE"
echo "Updated: $(date)" >> "$VERSION_FILE"
echo "GitHub Repository: https://github.com/vinaykumarvk/rfp_response_generator_clean" >> "$VERSION_FILE"

# Create a small tar.gz archive
echo "Creating archive of GitHub-ready files..."
tar -czf "$GITHUB_DIR.tar.gz" "$GITHUB_DIR"

echo "Preparation completed!"
echo "GitHub-ready files directory: $GITHUB_DIR"
echo "Archive created: $GITHUB_DIR.tar.gz"
echo 
echo "To push to GitHub:"
echo "1. Clone the repository: git clone https://github.com/vinaykumarvk/rfp_response_generator_clean.git"
echo "2. Extract the archive and copy the files to the cloned repository"
echo "3. Commit and push the changes"