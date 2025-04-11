/**
 * Create a test requirement in the database for testing
 */
import { db } from "./db";
import { excelRequirementResponses } from "@shared/schema";

async function createTestRequirement() {
  try {
    console.log("Creating test requirement...");
    
    // Create a simple test requirement
    const [testRequirement] = await db
      .insert(excelRequirementResponses)
      .values({
        rfpName: "Test RFP",
        requirementId: "TEST-123",
        uploadedBy: "System Test",
        category: "Test Category",
        requirement: "List 3 document management features. Keep it brief.",
        finalResponse: "",
        openaiResponse: null,
        anthropicResponse: null,
        deepseekResponse: null,
        moaResponse: null,
        similarQuestions: "",
        rating: null,
        feedback: null,
        modelProvider: null
      })
      .returning();
    
    console.log("Test requirement created successfully:");
    console.log(`- ID: ${testRequirement.id}`);
    console.log(`- Requirement: ${testRequirement.requirement}`);
    console.log("Use this ID for testing endpoints that require a requirementId.");
    
    return testRequirement;
  } catch (error) {
    console.error("Error creating test requirement:", error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (process.argv[1].endsWith("create_test_requirement.js")) {
  createTestRequirement()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch(error => {
      console.error("Failed:", error);
      process.exit(1);
    });
}

export { createTestRequirement };