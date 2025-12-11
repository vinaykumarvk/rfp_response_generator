-- Add fitment_score column to excel_requirement_responses table
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS fitment_score real;

-- Add index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_fitment_score ON excel_requirement_responses(fitment_score) WHERE fitment_score IS NOT NULL;

-- Create rfp_vector_store_mappings table for binding RFPs to vector stores
CREATE TABLE IF NOT EXISTS rfp_vector_store_mappings (
  id SERIAL PRIMARY KEY,
  rfp_name TEXT NOT NULL,
  vector_store_id TEXT NOT NULL,
  vector_store_name TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(rfp_name, vector_store_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rfp_vector_store_mappings_rfp_name ON rfp_vector_store_mappings(rfp_name);
CREATE INDEX IF NOT EXISTS idx_rfp_vector_store_mappings_vector_store_id ON rfp_vector_store_mappings(vector_store_id);

-- Add vector_store_ids column to excel_requirement_responses table
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS vector_store_ids text;

-- Add extended EKG fields for structured responses
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS ekg_overall_fitment_percentage integer;
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS ekg_customer_response text;
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS ekg_subrequirements text;
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS ekg_references text;
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS ekg_raw_response text;
ALTER TABLE excel_requirement_responses ADD COLUMN IF NOT EXISTS ekg_subrequirements_available text;
