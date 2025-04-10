// Automated test script for generating responses and validating the model-specific fields are saved properly
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test configuration
const TEST_CONFIG = {
  requirements: [
    "Automated test requirement 1 for API connectivity testing",
    "Automated test requirement 2 for database storage validation"
  ],
  providers: ["openai", "anthropic", "deepseek", "moa"],
  logFile: path.join(__dirname, 'test_results.log')
};

// Utility to append to the log file
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  fs.appendFileSync(TEST_CONFIG.logFile, logEntry);
}

// Initialize log file
function initLogFile() {
  fs.writeFileSync(TEST_CONFIG.logFile, `=== AUTOMATED TESTING STARTED AT ${new Date().toISOString()} ===\n\n`);
}

// Function to test a specific requirement with a specific provider
async function testRequirementWithProvider(requirement, provider) {
  return new Promise((resolve, reject) => {
    log(`Testing requirement with ${provider}:\n"${requirement}"`);
    
    // Run the Python generator script directly
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), '..', 'rfp_response_generator.py'),
      requirement,
      provider
    ]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        log(`ERROR: Python process exited with code ${code}`);
        log(`STDERR: ${stderr}`);
        reject(`Process failed with code ${code}`);
        return;
      }
      
      try {
        // Parse the JSON output
        const result = JSON.parse(stdout);
        
        log(`SUCCESS: Generated response with ${provider}`);
        log(`Response length: ${result.generated_response ? result.generated_response.length : 0} characters`);
        
        const modelSpecificField = `${provider}_response`;
        if (result[modelSpecificField]) {
          log(`${modelSpecificField} is present with length: ${result[modelSpecificField].length}`);
        } else {
          log(`WARNING: ${modelSpecificField} is not present in the result!`);
        }
        
        resolve(result);
      } catch (error) {
        log(`ERROR: Failed to parse Python output: ${error.message}`);
        log(`Raw output: ${stdout.substring(0, 500)}...`);
        reject(error);
      }
    });
    
    // Handle process error
    pythonProcess.on('error', (error) => {
      log(`ERROR: Failed to start Python process: ${error.message}`);
      reject(error);
    });
  });
}

// Main test runner
async function runTests() {
  initLogFile();
  log('Starting automated test suite...');
  
  const results = {
    total: 0,
    success: 0,
    failures: []
  };
  
  for (const requirement of TEST_CONFIG.requirements) {
    for (const provider of TEST_CONFIG.providers) {
      results.total++;
      
      try {
        log(`\n=== TEST ${results.total}: ${provider.toUpperCase()} with requirement ${results.total} ===`);
        const result = await testRequirementWithProvider(requirement, provider);
        
        // Check for basic success conditions
        if (result.generated_response) {
          results.success++;
          log(`TEST PASSED: Got valid response from ${provider}`);
        } else {
          results.failures.push({
            provider,
            requirement,
            reason: "No generated_response field in result"
          });
          log(`TEST FAILED: No generated_response from ${provider}`);
        }
      } catch (error) {
        results.failures.push({
          provider,
          requirement,
          reason: error.message || String(error)
        });
        log(`TEST FAILED: ${error.message || error}`);
      }
      
      // Add a short delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Log summary
  log('\n=== TEST SUMMARY ===');
  log(`Total tests: ${results.total}`);
  log(`Successful: ${results.success}`);
  log(`Failed: ${results.failures.length}`);
  
  if (results.failures.length > 0) {
    log('\nFAILURES:');
    results.failures.forEach((failure, index) => {
      log(`${index + 1}. ${failure.provider} - "${failure.requirement.substring(0, 30)}...": ${failure.reason}`);
    });
  }
  
  log(`\n=== TESTING COMPLETED AT ${new Date().toISOString()} ===`);
}

// Run the tests
runTests().catch(error => {
  log(`FATAL ERROR: ${error.message || error}`);
});