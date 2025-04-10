/**
 * Direct MOA Test Script
 * Run this script directly with Node to test MOA responses
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import process from 'process';
import { exec } from 'child_process';
import ws from 'ws';

// Configure Neon serverless to use the ws package
neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set");
  process.exit(1);
}

// Create database connection
const pool = new Pool({ connectionString: databaseUrl });

/**
 * Tests MOA responses in the database
 */
async function testMoaResponses() {
  console.log("=== MOA RESPONSE TEST ===");
  console.log("Checking database for MOA responses...");

  try {
    // Query the database for responses where model_provider = 'moa'
    const moaResponses = await pool.query(`
      SELECT id, requirement, moa_response, final_response, model_provider
      FROM excel_requirement_responses
      WHERE model_provider = 'moa'
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log(`Found ${moaResponses.rowCount} MOA responses.`);

    // Check if we have any MOA responses
    if (moaResponses.rowCount === 0) {
      console.log("No MOA responses found in the database.");
      return { 
        totalTested: 0,
        passing: 0,
        failing: 0,
        message: "No MOA responses found"
      };
    }

    // Test each response to see if finalResponse is set
    let passCount = 0;
    let failCount = 0;
    
    for (const row of moaResponses.rows) {
      const { id, requirement, moa_response, final_response, model_provider } = row;
      console.log(`\nTesting MOA response ID: ${id}`);
      console.log(`- Requirement: ${requirement.substring(0, 50)}...`);
      
      const tests = [
        {
          name: "model_provider is correctly set to 'moa'",
          passed: model_provider === 'moa',
          value: model_provider
        },
        {
          name: "moa_response is present",
          passed: Boolean(moa_response),
          value: moa_response ? `${moa_response.substring(0, 30)}... (${moa_response.length} chars)` : 'null'
        },
        {
          name: "final_response is present",
          passed: Boolean(final_response),
          value: final_response ? `${final_response.substring(0, 30)}... (${final_response.length} chars)` : 'null'
        },
        {
          name: "final_response matches moa_response",
          passed: final_response === moa_response,
          value: final_response === moa_response ? 'true' : 'false'
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
  } finally {
    await pool.end();
  }
}

// Run the test function
testMoaResponses()
  .then(results => {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error("Error running MOA test:", error);
    process.exit(1);
  });