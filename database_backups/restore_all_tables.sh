#!/bin/bash
# Run this script to restore all removed tables
# Created on Tue 15 Apr 2025 01:40:37 PM UTC

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "Restoring excel_requirements table..."
psql $DATABASE_URL -f restore_excel_requirements.sql
echo "Restoring reference_responses table..."
psql $DATABASE_URL -f restore_reference_responses.sql
echo "Restoring rfp_responses table..."
psql $DATABASE_URL -f restore_rfp_responses.sql
echo "Restoring similar_questions table..."
psql $DATABASE_URL -f restore_similar_questions.sql
echo "Restoring users table..."
psql $DATABASE_URL -f restore_users.sql
