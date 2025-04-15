#!/bin/bash
set -e

echo "===== RFP Response Generator - GitHub Merge Helper ====="
echo "This script will help you merge this optimized codebase with the GitHub repository."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git first."
    exit 1
fi

# Extract the optimized code
echo "Step 1: Extracting the optimized codebase..."
if [ ! -d "rfp_response_generator_v1.2_github_ready" ]; then
    tar -xzf rfp_response_generator_v1.2_github_ready.tar.gz
fi

# Ask for the GitHub repository URL
read -p "Step 2: Enter the GitHub repository URL (e.g., https://github.com/username/repo.git): " repo_url

if [ -z "$repo_url" ]; then
    echo "Error: No repository URL provided. Exiting."
    exit 1
fi

# Create a temporary directory for the merge
temp_dir=$(mktemp -d)
echo "Step 3: Cloning the GitHub repository to temporary location..."
git clone "$repo_url" "$temp_dir"

# Copy the optimized files to the GitHub repository
echo "Step 4: Copying optimized files to the GitHub repository..."
cp -r rfp_response_generator_v1.2_github_ready/* "$temp_dir/"

# Commit and push the changes
echo "Step 5: Committing and pushing changes..."
cd "$temp_dir"
git add .
git commit -m "Update codebase to version 1.2"

echo ""
echo "Step 6: Ready to push! Review the changes above."
echo "To push changes to GitHub, run these commands:"
echo "  cd $temp_dir"
echo "  git push origin main"  # or whichever branch you're using
echo ""
echo "If you want to discard this operation, simply delete the temporary directory:"
echo "  rm -rf $temp_dir"
