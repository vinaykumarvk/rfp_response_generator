// Direct DB update utility script for fixing model responses
import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon serverless connection
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set!");
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Function to get all requirement responses
async function getAllRequirements() {
  try {
    const query = `
      SELECT id, "rfpName", "requirementId", "uploadedBy", category, requirement, "finalResponse"
      FROM excel_requirement_responses
      ORDER BY id
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} requirements in database`);
    return result.rows;
  } catch (error) {
    console.error("Error fetching requirements:", error);
    throw error;
  }
}

// Function to directly update a requirement with OpenAI response
async function updateRequirementWithOpenAI(id, openaiResponse) {
  try {
    if (!openaiResponse || typeof openaiResponse !== 'string' || openaiResponse.trim() === '') {
      throw new Error("Invalid or empty openaiResponse provided");
    }
    
    console.log(`Updating requirement ${id} with OpenAI response (${openaiResponse.length} chars)`);
    
    const query = `
      UPDATE excel_requirement_responses
      SET 
        "openaiResponse" = $1,
        "finalResponse" = $1,
        "modelProvider" = 'openai'
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [openaiResponse, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`No requirement found with id ${id}`);
    }
    
    console.log(`Successfully updated requirement ${id}`);
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating requirement ${id}:`, error);
    throw error;
  }
}

// Main function to run a direct test update on a specific requirement
async function runDirectUpdate(requirementId, testText) {
  try {
    // Set a default test response if not provided
    const content = testText || `## Direct Test Update Response
    
This is a direct test update to verify the database storage functionality for model responses.

### Key Features:
- Direct database update bypassing API layers
- Timestamp: ${new Date().toISOString()}
- Method: Query-level update with openaiResponse field
- Status: Test data for debugging purposes

This response indicates that the database update functionality is working properly for the OpenAI response field.
`;
    
    const result = await updateRequirementWithOpenAI(requirementId, content);
    console.log("Update result:", result);
    return result;
  } catch (error) {
    console.error("Failed to run direct update:", error);
    throw error;
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Check if this script is being run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const requirementId = parseInt(args[0]);
  const content = args[1];
  
  if (!requirementId || isNaN(requirementId)) {
    console.error("Please provide a valid requirement ID as the first argument");
    process.exit(1);
  }
  
  runDirectUpdate(requirementId, content)
    .then(() => {
      console.log("Direct update completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("Direct update failed:", error);
      process.exit(1);
    });
} else {
  // If imported as a module, export the functions
  module.exports = {
    getAllRequirements,
    updateRequirementWithOpenAI,
    runDirectUpdate
  };
}