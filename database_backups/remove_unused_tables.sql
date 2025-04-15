-- SQL to remove unused tables
-- Created on Tue 15 Apr 2025 01:41:27 PM UTC
-- IMPORTANT: Run this only after verifying these tables are not needed

BEGIN;
DROP TABLE IF EXISTS excel_requirements CASCADE;
DROP TABLE IF EXISTS reference_responses CASCADE;
DROP TABLE IF EXISTS rfp_responses CASCADE;
DROP TABLE IF EXISTS similar_questions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
COMMIT;
