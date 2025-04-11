#!/bin/bash
# Deployment Environment Checker Script
# This script performs essential checks on the deployment environment 
# and installs any missing required packages

echo "====== DEPLOYMENT ENVIRONMENT CHECKER ======"
echo "Running system checks..."

# Check Python version
echo -e "\n1. Checking Python version:"
python3 --version

# Check Python dependencies
echo -e "\n2. Checking Python dependencies:"
PIP_DEPS=("openai" "anthropic" "numpy" "pandas" "scikit-learn" "gdown" "joblib" "openpyxl")

# Create a function to check and install a dependency
check_and_install() {
  local pkg=$1
  echo -n "Checking for $pkg... "
  if python3 -c "import $pkg" 2>/dev/null; then
    echo "✓ Found"
  else
    echo "✗ Missing. Installing..."
    pip3 install $pkg
    if python3 -c "import $pkg" 2>/dev/null; then
      echo "  ✓ Successfully installed $pkg"
    else
      echo "  ✗ Failed to install $pkg"
    fi
  fi
}

# Check and install all dependencies
for pkg in "${PIP_DEPS[@]}"; do
  check_and_install $pkg
done

# Check critical files
echo -e "\n3. Checking for critical files:"
CRITICAL_FILES=(
  "rfp_embeddings.pkl" 
  "attached_assets/previous_responses.xlsx" 
  "server/rfp_response_generator.py" 
  "server/moa_synthesis.py"
)

for file in "${CRITICAL_FILES[@]}"; do
  echo -n "Checking for $file... "
  if [ -f "$file" ]; then
    echo "✓ Found"
  else
    echo "✗ Missing"
  fi
done

# Check API keys
echo -e "\n4. Checking API key availability:"
echo -n "OpenAI API Key... "
if grep -q "OPENAI_API_KEY" server/rfp_response_generator.py; then
  echo "✓ Found in rfp_response_generator.py"
else
  echo "✗ Missing"
fi

echo -n "Anthropic API Key... "
if grep -q "ANTHROPIC_API_KEY" server/rfp_response_generator.py; then
  echo "✓ Found in rfp_response_generator.py"
else
  echo "✗ Missing"
fi

echo -n "DeepSeek API Key... "
if grep -q "DEEPSEEK_API_KEY" server/rfp_response_generator.py; then
  echo "✓ Found in rfp_response_generator.py"
else
  echo "✗ Missing"
fi

# Check database configuration
echo -e "\n5. Checking database configuration:"
if [ -n "$DATABASE_URL" ]; then
  echo "✓ DATABASE_URL environment variable is set"
else
  echo "✗ DATABASE_URL environment variable is missing"
fi

echo -e "\n====== DEPLOYMENT CHECK COMPLETE ======"
echo "Review any issues above and fix them before proceeding with deployment."