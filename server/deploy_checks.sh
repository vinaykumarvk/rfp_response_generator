#!/bin/bash
#
# Deployment Environment Verification and Fixes
# This script checks the deployment environment and fixes common issues.
#

echo "=== RFP Response Generator Deployment Verification Script ==="
echo "Running checks on $(date)"
echo "Current directory: $(pwd)"

# Set colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# ---------- Check for critical files ----------
echo -e "\n${YELLOW}Checking for critical files...${NC}"

declare -A files=(
  ["rfp_embeddings.pkl"]="Main embeddings file (135MB)"
  ["attached_assets/previous_responses.xlsx"]="Previous responses Excel file"
  ["server/rfp_response_generator.py"]="Main Python generator script"
  ["server/moa_synthesis.py"]="MOA synthesis script"
  ["server/deployment_validator.py"]="Deployment validator script"
)

missing_files=0
for file in "${!files[@]}"; do
  if [[ -f "$file" ]]; then
    size=$(du -h "$file" | cut -f1)
    echo -e "✅ ${GREEN}Found${NC}: $file ($size) - ${files[$file]}"
  else
    echo -e "❌ ${RED}Missing${NC}: $file - ${files[$file]}"
    missing_files=$((missing_files + 1))
  fi
done

if [[ $missing_files -gt 0 ]]; then
  echo -e "${RED}Warning: $missing_files critical files are missing!${NC}"
else
  echo -e "${GREEN}All critical files are present.${NC}"
fi

# ---------- Check Python environment ----------
echo -e "\n${YELLOW}Checking Python environment...${NC}"

# Check Python version
python_version=$(python3 --version 2>&1)
if [[ $? -eq 0 ]]; then
  echo -e "✅ ${GREEN}Python detected${NC}: $python_version"
else
  echo -e "❌ ${RED}Python not found!${NC}"
  exit 1
fi

# Check critical Python modules
declare -A modules=(
  ["openai"]="OpenAI API client"
  ["anthropic"]="Anthropic API client"
  ["pandas"]="Data manipulation library"
  ["numpy"]="Numerical computation library"
  ["sklearn"]="Machine learning library"
  ["openpyxl"]="Excel file handling"
)

missing_modules=0
for module in "${!modules[@]}"; do
  if python3 -c "import $module" &>/dev/null; then
    # Try to get version
    version=$(python3 -c "import $module; print(getattr($module, '__version__', 'unknown'))" 2>/dev/null)
    echo -e "✅ ${GREEN}Module installed${NC}: $module $version - ${modules[$module]}"
  else
    echo -e "❌ ${RED}Module missing${NC}: $module - ${modules[$module]}"
    missing_modules=$((missing_modules + 1))
  fi
done

if [[ $missing_modules -gt 0 ]]; then
  echo -e "${RED}Warning: $missing_modules Python modules are missing!${NC}"
  echo "Run: pip install openai anthropic pandas numpy scikit-learn openpyxl"
else
  echo -e "${GREEN}All required Python modules are installed.${NC}"
fi

# ---------- Check embeddings file ----------
echo -e "\n${YELLOW}Checking embeddings file integrity...${NC}"

if [[ -f "rfp_embeddings.pkl" ]]; then
  filesize=$(du -m "rfp_embeddings.pkl" | cut -f1)
  
  if [[ $filesize -lt 100 ]]; then
    echo -e "⚠️ ${YELLOW}Warning${NC}: embeddings file seems too small ($filesize MB). Expected ~135MB."
  else
    echo -e "✅ ${GREEN}Embeddings file size looks good${NC}: $filesize MB"
  fi
  
  # Attempt to validate pickle integrity
  python3 -c "import pickle; pickle.load(open('rfp_embeddings.pkl', 'rb'))" &>/dev/null
  if [[ $? -eq 0 ]]; then
    echo -e "✅ ${GREEN}Embeddings file is valid pickle${NC}"
  else
    echo -e "❌ ${RED}Embeddings file is corrupted${NC}. Cannot load pickle."
  fi
else
  echo -e "${RED}Embeddings file not found!${NC}"
fi

# ---------- Check API keys environment variables ----------
echo -e "\n${YELLOW}Checking API keys environment variables...${NC}"

# Array of required keys
declare -A api_keys=(
  ["OPENAI_API_KEY"]="OpenAI API"
  ["ANTHROPIC_API_KEY"]="Anthropic API"
  ["DEEPSEEK_API_KEY"]="DeepSeek API"
)

missing_keys=0
for key in "${!api_keys[@]}"; do
  if [[ -n "${!key}" ]]; then
    # Show first few characters of the key
    value="${!key}"
    prefix="${value:0:5}..."
    echo -e "✅ ${GREEN}Found${NC}: $key ($prefix) - ${api_keys[$key]}"
  else
    echo -e "❌ ${RED}Missing${NC}: $key - ${api_keys[$key]}"
    missing_keys=$((missing_keys + 1))
  fi
done

if [[ $missing_keys -gt 0 ]]; then
  echo -e "${RED}Warning: $missing_keys API keys are missing!${NC}"
  echo "Make sure to set them in the deployment environment or .env.production file."
else
  echo -e "${GREEN}All required API keys are set.${NC}"
fi

# ---------- Check database connection ----------
echo -e "\n${YELLOW}Checking database connection...${NC}"

if [[ -n "$DATABASE_URL" ]]; then
  echo -e "✅ ${GREEN}Database URL is set${NC}"
  
  # Extract database name from URL (simple approach)
  dbname=$(echo "$DATABASE_URL" | sed -r 's/.*\/([^?]*).*/\1/')
  echo "Database name appears to be: $dbname"
  
  # Try a simple connection test
  if command -v pg_isready &>/dev/null; then
    pg_isready
    if [[ $? -eq 0 ]]; then
      echo -e "✅ ${GREEN}Database connection successful${NC}"
    else
      echo -e "❌ ${RED}Database connection failed${NC}"
    fi
  else
    echo -e "ℹ️ ${YELLOW}pg_isready not available, skipping connection test${NC}"
  fi
else
  echo -e "❌ ${RED}DATABASE_URL is not set!${NC}"
fi

# ---------- Final Summary ----------
echo -e "\n${YELLOW}==== Deployment Verification Summary =====${NC}"

if [[ $missing_files -gt 0 || $missing_modules -gt 0 || $missing_keys -gt 0 ]]; then
  echo -e "${RED}⚠️ There are issues that need to be addressed before deployment!${NC}"
  
  if [[ $missing_files -gt 0 ]]; then
    echo -e "- ${RED}$missing_files critical files are missing${NC}"
  fi
  
  if [[ $missing_modules -gt 0 ]]; then
    echo -e "- ${RED}$missing_modules Python modules are missing${NC}"
  fi
  
  if [[ $missing_keys -gt 0 ]]; then
    echo -e "- ${RED}$missing_keys API keys are not set${NC}"
  fi
  
  echo -e "\nPlease fix these issues before deploying."
else
  echo -e "${GREEN}✅ All basic deployment requirements are met.${NC}"
  echo -e "You may proceed with deployment!"
fi

echo -e "\n${YELLOW}Verification completed at $(date)${NC}"