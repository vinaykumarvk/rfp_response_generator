// Sample data script
import { pool } from './server/db.js';

async function addSampleRfpResponse() {
  try {
    const result = await pool.query(
      `INSERT INTO rfp_responses 
       (client_name, client_industry, rfp_title, rfp_id, submission_date, budget_range, 
        project_summary, company_name, point_of_contact, company_strengths, 
        selected_template, customizations, generated_content)
       VALUES 
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        'Global Financial',
        'Investment',
        'Wealth Management Platform',
        'RFP-2025-002',
        '2025-06-30',
        '$1M-$3M',
        'A next-generation wealth management platform with AI-powered investment insights.',
        'IntellectAI',
        'Jane Doe',
        'Market-leading AI technology',
        'Wealth Template',
        'Personalized dashboards',
        `# Wealth Management Platform Proposal

IntellectAI is pleased to present this proposal for Global Financial's next-generation wealth management platform. Our solution offers cutting-edge AI-powered investment insights and comprehensive portfolio management capabilities.

## Solution Overview
Our wealth management platform includes:
- AI-powered investment recommendations
- Comprehensive portfolio management
- Client engagement tools
- Regulatory compliance framework`
      ]
    );
    
    console.log('Sample RFP response added:', result.rows[0]);
  } catch (error) {
    console.error('Error adding sample RFP response:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
addSampleRfpResponse();