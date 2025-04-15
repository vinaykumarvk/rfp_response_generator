#!/bin/bash
set -e

GITHUB_REPO="vinaykumarvk/rfp_response_generator_clean"
GITHUB_URL="https://github.com/$GITHUB_REPO.git"

echo "===== RFP Response Generator - GitHub Push Helper ====="
echo "This script will push the optimized codebase to the GitHub repository:"
echo "  $GITHUB_URL"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git first."
    exit 1
fi

# Check if GitHub CLI is installed - useful but not required
has_gh=false
if command -v gh &> /dev/null; then
    has_gh=true
fi

# Extract the optimized code if needed
echo "Step 1: Ensuring the optimized codebase is extracted..."
if [ ! -d "rfp_response_generator_v1.2_github_ready" ]; then
    if [ -f "rfp_response_generator_v1.2_github_ready.tar.gz" ]; then
        tar -xzf rfp_response_generator_v1.2_github_ready.tar.gz
    else
        echo "Error: Couldn't find the optimized codebase archive."
        exit 1
    fi
fi

# Create a temporary directory for the push
temp_dir=$(mktemp -d)
echo "Step 2: Preparing Git repository in temporary location: $temp_dir"

# Initialize a new git repository
cd "$temp_dir"
git init

# Check if the user is authenticated with GitHub
if $has_gh; then
    if ! gh auth status &>/dev/null; then
        echo "You need to authenticate with GitHub:"
        gh auth login
    fi
fi

# Add the GitHub remote
git remote add origin "$GITHUB_URL"

# Copy the optimized files to the new repository
echo "Step 3: Copying optimized files to the Git repository..."
cp -r ../rfp_response_generator_v1.2_github_ready/* ./

# Create a VERSION.md file
cat > VERSION.md << EOF
# RFP Response Generator v1.2

Version: 1.2
Date: $(date +%Y-%m-%d)

## About This Version
This is version 1.2 of the RFP Response Generator application.

## Key Changes in v1.2
- Fixed MOA progress bar issue
- Optimized code structure for GitHub deployment
- Added improved error handling for API requests
- Enhanced UI/UX for mobile responsiveness
EOF

# Add all files
git add .

# Commit the changes
git commit -m "Initial version 1.2 commit" -m "This is the optimized version 1.2 of the RFP Response Generator."

echo ""
echo "Step 4: Ready to push!"
echo ""
echo "To push to GitHub, you have two options:"
echo ""
echo "1. Use GitHub CLI (if installed):"
echo "   cd $temp_dir"
echo "   gh repo create $GITHUB_REPO --public --source=. --push"
echo ""
echo "2. Push manually (if repository already exists):"
echo "   cd $temp_dir"
echo "   git push -u origin main"
echo ""
echo "Note: You'll need proper authentication for the GitHub repository."
echo "If you want to discard this operation, simply delete the temporary directory:"
echo "   rm -rf $temp_dir"
