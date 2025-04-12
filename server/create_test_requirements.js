/**
 * Script to create test requirements in the database for testing our fix
 * This ensures we have valid requirement records to test against
 */

import { db } from './db.js';
import { excelRequirementResponses } from '../shared/schema.js';

async function createTestRequirements() {
  try {
    console.log('Creating test requirements in the database...');
    
    // Test requirements for different topics
    const testRequirements = [
      {
        id: 1,
        requirement: "Describe the reporting capabilities for investment performance",
        category: "Reporting",
        rfpName: "Test RFP",
        uploadedBy: "Test User"
      },
      {
        id: 2,
        requirement: "Detail your solution's data backup and recovery process",
        category: "Security",
        rfpName: "Test RFP",
        uploadedBy: "Test User"
      },
      {
        id: 3,
        requirement: "Explain how your system handles tax reporting for multiple jurisdictions",
        category: "Tax",
        rfpName: "Test RFP",
        uploadedBy: "Test User"
      }
    ];
    
    // Check if requirements already exist
    for (const req of testRequirements) {
      const existingReq = await db.select()
        .from(excelRequirementResponses)
        .where(eb => eb.eq(excelRequirementResponses.id, req.id))
        .limit(1);
      
      if (existingReq.length > 0) {
        console.log(`Requirement ID ${req.id} already exists. Updating...`);
        
        // Update existing requirement
        await db.update(excelRequirementResponses)
          .set({
            requirement: req.requirement,
            category: req.category,
            rfpName: req.rfpName,
            uploadedBy: req.uploadedBy,
            // Reset response fields for clean testing
            finalResponse: null,
            openaiResponse: null,
            anthropicResponse: null,
            deepseekResponse: null,
            moaResponse: null,
            modelProvider: null,
            rating: null
          })
          .where(eb => eb.eq(excelRequirementResponses.id, req.id));
        
        console.log(`Updated requirement ID ${req.id}`);
      } else {
        console.log(`Creating new requirement ID ${req.id}...`);
        
        // Insert new requirement
        await db.insert(excelRequirementResponses)
          .values({
            id: req.id,
            requirement: req.requirement,
            category: req.category,
            rfpName: req.rfpName,
            uploadedBy: req.uploadedBy
          });
        
        console.log(`Created requirement ID ${req.id}`);
      }
    }
    
    console.log('Test requirements successfully created/updated!');
    
    // Verify the requirements were created correctly
    const verifyReqs = await db.select()
      .from(excelRequirementResponses)
      .where(eb => eb.inArray(excelRequirementResponses.id, [1, 2, 3]));
    
    console.log(`Verification: Found ${verifyReqs.length} test requirements in the database`);
    verifyReqs.forEach(req => {
      console.log(`ID ${req.id}: ${req.requirement.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('Error creating test requirements:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the function
createTestRequirements();