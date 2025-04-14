#!/bin/bash

# This script shows what files would be removed by the cleanup_for_github.sh script
# without actually deleting anything

echo "=== FILES THAT WOULD BE REMOVED BY CLEANUP SCRIPT ==="
echo ""

echo "1. Cache and build directories:"
echo "   - .cache/ (if exists)"
echo "   - __pycache__/ (if exists)"
echo "   - dist/ (if exists)"
echo "   - build/ (if exists)"
echo ""

echo "2. Backup directories:"
echo "   - server/backup/ - $(find server/backup -type f | wc -l) files"
echo "   - server/temp_files/ - $(find server/temp_files -type f 2>/dev/null | wc -l) files"
echo ""

echo "3. Test files:"
for test_file in test_*.py **/test_*.py; do
  if [ -f "$test_file" ]; then
    echo "   - $test_file"
  fi
done
echo ""

echo "4. Specific temporary/fix files:"
for file in add-sample.js direct_express_fix.js direct_update_113.py fix_db_113.js fix_db_113.py fix_req_113.py; do
  if [ -f "$file" ]; then
    echo "   - $file"
  fi
done

echo "5. Test HTML files:"
for html_file in client/api-test.html client/public/api-test.html client/public/test-api.html; do
  if [ -f "$html_file" ]; then
    echo "   - $html_file"
  fi
done
echo ""

echo "=== IMPORTANT FILES THAT WILL BE KEPT ==="
echo ""
echo "1. Core application files:"
echo "   - server/index.ts"
echo "   - server/routes.ts"
echo "   - server/storage.ts"
echo "   - call_llm.py"
echo "   - generate_prompt.py"
echo "   - database.py"
echo ""

echo "2. Frontend files:"
echo "   - client/src/pages/ directory ($(find client/src/pages -type f | wc -l) files)"
echo "   - client/src/components/ directory ($(find client/src/components -type f | wc -l) files)"
echo ""

echo "3. Configuration files:"
echo "   - package.json"
echo "   - tsconfig.json"
echo "   - drizzle.config.ts"
echo "   - postcss.config.js"
echo "   - tailwind.config.ts"
echo "   - README.md"
echo "   - ARCHITECTURE.md"
echo "   - .gitignore"
echo "   - .env.example"

echo ""
echo "Total files to be removed: $(find . -name "test_*.py" -o -name "fix_*.py" -o -name "fix_*.js" -o -name "direct_*.py" -o -name "direct_*.js" -o -name "add-sample.js" -o -path "*/server/backup/*" -o -path "*/__pycache__/*" | wc -l)"
echo "Total application files to be kept: $(find . -not -path "*/\.*" -not -path "*/node_modules/*" -not -path "*/__pycache__/*" -not -path "*/server/backup/*" -not -path "*/server/temp_files/*" -not -name "test_*" -not -name "fix_*" -not -name "direct_*" -not -name "add-sample.js" -type f | wc -l)"
echo ""
echo "Run './cleanup_for_github.sh' to actually perform the cleanup operation."