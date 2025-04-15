-- SQL to remove unused tables
-- Created on April 15, 2025
-- IMPORTANT: Run this script only after verifying these tables are not needed
-- Backups of these tables have been created and can be restored if needed

BEGIN;

-- Drop unused tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS rfp_responses CASCADE;
DROP TABLE IF EXISTS similar_questions CASCADE;
DROP TABLE IF EXISTS excel_requirements CASCADE;

COMMIT;

-- To run this script:
-- psql $DATABASE_URL -f database_backups/drop_unused_tables.sql