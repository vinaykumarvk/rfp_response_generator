/**
 * Test script to verify fix for the MFA hardcoded requirement issue
 * 
 * This script creates a sample RFP requirement and calls the generate-response
 * endpoint to verify we no longer get MFA-related responses regardless of input.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test API endpoint URL (using localhost for testing)
const API_URL = 'http://localhost:5000/api/generate-response';

// Test requirements with different topics to verify we don't get MFA responses
const testRequirements = [
  {
    id: 1,
    text: "Describe the reporting capabilities for investment performance",
    provider: "openai"
  },
  {
    id: 2,
    text: "Detail your solution's data backup and recovery process",
    provider: "anthropic"
  },
  {
    id: 3, 
    text: "Explain how your system handles tax reporting for multiple jurisdictions",
    provider: "deepseek"
  }
];

/**
 * Test a single requirement to verify response content
 */
async function testRequirement(reqInfo) {
  console.log(`\n--- Testing requirement: "${reqInfo.text}" with provider: ${reqInfo.provider} ---`);
  
  try {
    // Call the generate-response endpoint
    const response = await axios.post(API_URL, {
      requirement: reqInfo.text,
      provider: reqInfo.provider,
      requirementId: reqInfo.id,
      rfpName: "Test RFP",
      uploadedBy: "Test User"
    }, {
      timeout: 45000 // 45 second timeout for API call
    });
    
    // Check if we got a valid response
    if (response.status === 200) {
      console.log('Response generation successful');
      
      // Log first 200 characters of response to check content
      const finalResponse = response.data.response?.finalResponse || '';
      console.log(`Response preview (${finalResponse.length} chars):`);
      console.log(finalResponse.substring(0, 200) + '...');
      
      // Check if response mentions MFA - this would indicate the issue persists
      if (finalResponse.toLowerCase().includes('multi-factor authentication') || 
          finalResponse.toLowerCase().includes('mfa')) {
        console.error('❌ TEST FAILED: Response still contains MFA content');
      } else {
        console.log('✅ TEST PASSED: Response does not contain MFA content');
      }
      
      // Save response to file for detailed inspection
      const outputPath = path.join(__dirname, `test_response_${reqInfo.provider}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
      console.log(`Full response saved to: ${outputPath}`);
      
      return {
        success: true,
        response: finalResponse,
        containsMfa: finalResponse.toLowerCase().includes('multi-factor authentication') || 
                     finalResponse.toLowerCase().includes('mfa')
      };
    } else {
      console.error(`Error: Unexpected status code ${response.status}`);
      return { success: false, error: `Unexpected status code ${response.status}` };
    }
  } catch (error) {
    console.error('Error calling generate-response API:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests and collect results
 */
async function runAllTests() {
  console.log('=== TESTING RFP RESPONSE GENERATION FIX ===');
  console.log(`Testing ${testRequirements.length} requirements against API endpoint: ${API_URL}`);
  
  const startTime = Date.now();
  const results = [];
  
  // Test each requirement sequentially
  for (const req of testRequirements) {
    const result = await testRequirement(req);
    results.push({
      requirement: req.text,
      provider: req.provider,
      ...result
    });
  }
  
  // Generate summary of results
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const passedTests = results.filter(r => r.success && !r.containsMfa).length;
  const failedTests = results.length - passedTests;
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total time: ${totalTime} seconds`);
  
  // Report overall success/failure
  if (failedTests === 0) {
    console.log('\n✅ ALL TESTS PASSED: Fix was successful');
  } else {
    console.log('\n❌ SOME TESTS FAILED: Fix needs more work');
  }
  
  // Save overall results to file
  const summaryPath = path.join(__dirname, 'test_results_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests,
    totalTimeSeconds: parseFloat(totalTime),
    results
  }, null, 2));
  console.log(`Test results saved to: ${summaryPath}`);
}

// Run all tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});