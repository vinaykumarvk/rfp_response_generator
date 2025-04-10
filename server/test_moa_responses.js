/**
 * Test script to verify MOA response generation and finalResponse setting
 * 
 * This script tests:
 * 1. Whether MOA Phase 1 correctly stores individual model responses
 * 2. Whether MOA Phase 2 successfully synthesizes responses
 * 3. Whether finalResponse field is correctly populated
 * 4. Whether modelProvider field is set to "moa"
 */

import { db } from './db.js';
import { storage } from './storage.js';
import { exec } from 'child_process';
import path from 'path';

async function testMoaResponses() {
  console.log("=== MOA RESPONSE TEST ===");
  console.log("Checking database for MOA responses...");

  try {
    // Query the database for responses where modelProvider = 'moa'
    const moaResponses = await db.query(`
      SELECT id, requirement, moaResponse, finalResponse, modelProvider
      FROM excel_requirement_responses
      WHERE modelProvider = 'moa'
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log(`Found ${moaResponses.rowCount} MOA responses.`);

    // Check if we have any MOA responses
    if (moaResponses.rowCount === 0) {
      console.log("No MOA responses found. Let's create one for testing...");
      return await generateTestMoaResponse();
    }

    // Test each response to see if finalResponse is set
    let passCount = 0;
    let failCount = 0;

    for (const row of moaResponses.rows) {
      const { id, requirement, moaResponse, finalResponse, modelProvider } = row;
      console.log(`\nTesting MOA response ID: ${id}`);
      console.log(`- Requirement: ${requirement.substring(0, 50)}...`);
      
      const tests = [
        {
          name: "modelProvider is correctly set to 'moa'",
          passed: modelProvider === 'moa',
          value: modelProvider
        },
        {
          name: "moaResponse is present",
          passed: Boolean(moaResponse),
          value: moaResponse ? `${moaResponse.substring(0, 30)}... (${moaResponse.length} chars)` : 'null'
        },
        {
          name: "finalResponse is present",
          passed: Boolean(finalResponse),
          value: finalResponse ? `${finalResponse.substring(0, 30)}... (${finalResponse.length} chars)` : 'null'
        },
        {
          name: "finalResponse matches moaResponse",
          passed: finalResponse === moaResponse,
          value: finalResponse === moaResponse ? 'true' : 'false'
        }
      ];

      // Log individual test results
      for (const test of tests) {
        console.log(`  ${test.passed ? '✓' : '✗'} ${test.name} (${test.value})`);
      }

      // Tally overall result
      const allPassed = tests.every(t => t.passed);
      if (allPassed) {
        console.log("  ✅ All tests PASSED for this response");
        passCount++;
      } else {
        console.log("  ❌ Some tests FAILED for this response");
        failCount++;
      }
    }

    // Show overall results
    console.log("\n=== OVERALL RESULTS ===");
    console.log(`Total MOA responses tested: ${moaResponses.rowCount}`);
    console.log(`Responses with all checks passing: ${passCount}`);
    console.log(`Responses with one or more failures: ${failCount}`);
    
    return {
      totalTested: moaResponses.rowCount,
      passing: passCount,
      failing: failCount
    };
  } catch (error) {
    console.error("Error testing MOA responses:", error);
    return { error: String(error) };
  }
}

// Generate a test MOA response for verification
async function generateTestMoaResponse() {
  console.log("Generating a test MOA response...");
  
  // Find an existing requirement to use for testing
  const existingRequirements = await db.query(`
    SELECT id, requirement 
    FROM excel_requirement_responses 
    ORDER BY id DESC LIMIT 1
  `);

  if (existingRequirements.rowCount === 0) {
    console.log("No existing requirements found to test with.");
    return { error: "No existing requirements found" };
  }

  const { id, requirement } = existingRequirements.rows[0];
  console.log(`Using requirement ID ${id}: ${requirement.substring(0, 50)}...`);

  // Use curl to call the /api/generate-response endpoint with MOA provider
  const command = `curl -X POST http://localhost:5000/api/generate-response -H "Content-Type: application/json" -d '{"requirementId": ${id}, "requirement": "${requirement.replace(/"/g, '\\"')}", "provider": "moa"}'`;
  
  return new Promise((resolve, reject) => {
    console.log("Calling API to generate MOA response...");
    console.log("This will take some time as it needs to complete both Phase 1 and Phase 2...");
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error calling API: ${error.message}`);
        resolve({ error: error.message, stdout, stderr });
        return;
      }
      
      try {
        // Give some time for database updates to complete
        console.log("API call completed, waiting for database updates...");
        await new Promise(r => setTimeout(r, 2000));
        
        // Fetch the updated requirement
        const updatedResponse = await db.query(`
          SELECT id, requirement, moaResponse, finalResponse, modelProvider
          FROM excel_requirement_responses
          WHERE id = $1
        `, [id]);
        
        if (updatedResponse.rowCount === 0) {
          console.log("Could not find the updated response.");
          resolve({ error: "Response not found after update" });
          return;
        }
        
        const response = updatedResponse.rows[0];
        console.log("\n=== TEST RESULTS ===");
        
        const tests = [
          {
            name: "modelProvider is set to 'moa'",
            passed: response.modelProvider === 'moa',
            value: response.modelProvider
          },
          {
            name: "moaResponse is present",
            passed: Boolean(response.moaResponse),
            value: response.moaResponse ? `${response.moaResponse.substring(0, 30)}... (${response.moaResponse.length} chars)` : 'null'
          },
          {
            name: "finalResponse is present",
            passed: Boolean(response.finalResponse),
            value: response.finalResponse ? `${response.finalResponse.substring(0, 30)}... (${response.finalResponse.length} chars)` : 'null'
          },
          {
            name: "finalResponse matches moaResponse",
            passed: response.finalResponse === response.moaResponse,
            value: response.finalResponse === response.moaResponse ? 'true' : 'false'
          }
        ];
        
        for (const test of tests) {
          console.log(`${test.passed ? '✓' : '✗'} ${test.name} (${test.value})`);
        }
        
        const allPassed = tests.every(t => t.passed);
        if (allPassed) {
          console.log("\n✅ All tests PASSED! MOA response generation is working correctly.");
        } else {
          console.log("\n❌ Some tests FAILED. MOA response generation needs fixing.");
        }
        
        resolve({
          success: allPassed,
          testResults: tests.map(t => ({ name: t.name, passed: t.passed })),
          responseId: id
        });
      } catch (dbError) {
        console.error("Error checking database after response generation:", dbError);
        resolve({ error: String(dbError) });
      }
    });
  });
}

// Note: In ES modules, we can't check if this is the main module the same way
// as in CommonJS. If needed, this functionality can be moved to a separate file.

// Export the functions
export { testMoaResponses, generateTestMoaResponse };