/**
 * Background import script for embeddings
 * This script runs the Python import script in the background and monitors progress
 */
const { spawn } = require('child_process');
const fs = require('fs');

// Function to run the import script with progress monitoring
function runImportScript() {
  console.log('Starting background import of embeddings to PostgreSQL...');
  
  // Start the Python script
  const importProcess = spawn('python', ['server/import_embeddings_to_db.py']);
  
  // Create a log file for progress
  const logStream = fs.createWriteStream('embeddings_import.log', { flags: 'a' });
  logStream.write(`\n--- Import Started at ${new Date().toISOString()} ---\n`);
  
  // Track progress
  let lastProgressReport = '';
  let completedCount = 0;
  let totalCount = 0;
  
  // Log output from the process
  importProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    logStream.write(output);
    
    // Extract progress information if available
    const progressMatch = output.match(/Imported (\d+)\/(\d+)/);
    if (progressMatch) {
      completedCount = parseInt(progressMatch[1], 10);
      totalCount = parseInt(progressMatch[2], 10);
      const progressPercent = (completedCount / totalCount * 100).toFixed(1);
      lastProgressReport = `Imported ${completedCount}/${totalCount} (${progressPercent}%)`;
    }
  });
  
  importProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(output);
    logStream.write(output);
    
    // Extract progress information if available
    const progressMatch = output.match(/Imported (\d+)\/(\d+)/);
    if (progressMatch) {
      completedCount = parseInt(progressMatch[1], 10);
      totalCount = parseInt(progressMatch[2], 10);
      const progressPercent = (completedCount / totalCount * 100).toFixed(1);
      lastProgressReport = `Imported ${completedCount}/${totalCount} (${progressPercent}%)`;
    }
  });
  
  // Handle completion
  importProcess.on('close', (code) => {
    if (code === 0) {
      const successMessage = 'Import completed successfully!';
      console.log(successMessage);
      logStream.write(`${successMessage}\n`);
    } else {
      const errorMessage = `Import process exited with code ${code}`;
      console.error(errorMessage);
      logStream.write(`${errorMessage}\n`);
    }
    
    logStream.write(`--- Import Ended at ${new Date().toISOString()} ---\n`);
    logStream.end();
  });
  
  // Report progress periodically
  const progressInterval = setInterval(() => {
    if (importProcess.killed) {
      clearInterval(progressInterval);
      return;
    }
    
    if (lastProgressReport) {
      console.log(`Progress: ${lastProgressReport}`);
      
      // Check if import is complete
      if (completedCount > 0 && completedCount === totalCount) {
        console.log('Import appears to be complete based on progress reporting');
        clearInterval(progressInterval);
      }
    }
  }, 30000); // Report every 30 seconds
}

// Run the import script
runImportScript();