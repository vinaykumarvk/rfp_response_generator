#!/bin/bash

# This script helps merge the current repository with an existing GitHub repository
# Usage: ./merge_with_github.sh <github_username> <github_repo> <branch_name>

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <github_username> <github_repo> [<branch_name>]"
    echo "Example: $0 vinaykumarvk rfp_response_generator_clean new-features"
    exit 1
fi

GITHUB_USERNAME=$1
GITHUB_REPO=$2
BRANCH_NAME=${3:-updated-rfp-generator}  # Default branch name if not provided

echo "Preparing to merge with GitHub repository: $GITHUB_USERNAME/$GITHUB_REPO on branch: $BRANCH_NAME"

# Step 1: First, run the cleanup script
echo "Step 1: Running cleanup script..."
./cleanup_for_github.sh

# Step 2: Initialize git repo if not already initialized
if [ ! -d ".git" ]; then
    echo "Step 2: Initializing git repository..."
    git init
else
    echo "Step 2: Git repository already initialized."
fi

# Step 3: Configure git with your information (modify these values as needed)
echo "Step 3: Configuring git..."
echo -n "Enter your name for git commits: "
read GIT_NAME
echo -n "Enter your email for git commits: "
read GIT_EMAIL

git config user.name "$GIT_NAME"
git config user.email "$GIT_EMAIL"

# Step 4: Add remote repository
echo "Step 4: Adding remote repository..."
git remote -v | grep origin >/dev/null 2>&1
if [ $? -eq 0 ]; then
    git remote remove origin
fi
git remote add origin "https://github.com/$GITHUB_USERNAME/$GITHUB_REPO.git"

# Step 5: Create a new branch
echo "Step 5: Creating branch: $BRANCH_NAME..."
git checkout -b "$BRANCH_NAME"

# Step 6: Add files to git
echo "Step 6: Adding files to git..."
git add .

# Step 7: Commit changes
echo "Step 7: Committing changes..."
git commit -m "Updated RFP Response Generator with cleaned codebase"

# Step 8: Instructions for pushing to GitHub
echo ""
echo "============================================================"
echo "Repository prepared for GitHub. To push to GitHub, you need to:"
echo ""
echo "1. Make sure you have a GitHub personal access token with repo permissions"
echo "2. Run the following command to push:"
echo "   git push -u origin $BRANCH_NAME"
echo ""
echo "If you're using a personal access token, you might need to use:"
echo "   git push https://<username>:<token>@github.com/$GITHUB_USERNAME/$GITHUB_REPO.git $BRANCH_NAME"
echo ""
echo "3. Then create a pull request on GitHub to merge your branch"
echo "   Visit: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO/pull/new/$BRANCH_NAME"
echo "============================================================"