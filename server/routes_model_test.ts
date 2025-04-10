// Simplified routes module for model-specific testing
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { storage } from './storage';

// Add a new endpoint for directly testing model-specific responses
export async function addModelTestEndpoint(app: any) {
  app.post("/api/model-specific-test", async (req: Request, res: Response) => {
    try {
      const { 
        provider = "openai", 
        requirementId,
        requirementText = "Sample test requirement for RFP response generation"
      } = req.body;
      
      if (!requirementId) {
        return res.status(400).json({ 
          success: false, 
          error: "requirementId is required" 
        });
      }
      
      // Find the existing requirement
      const existingRequirements = await storage.getExcelRequirementResponses();
      const existingRequirement = existingRequirements.find(r => r.id === parseInt(requirementId));
      
      if (!existingRequirement) {
        return res.status(404).json({
          success: false,
          error: `Requirement with ID ${requirementId} not found`
        });
      }
      
      console.log(`MODEL TEST: Found requirement ${requirementId}: "${existingRequirement.requirement.substring(0, 50)}..."`);
      
      // Use the model-specific test script
      const scriptPath = path.resolve(process.cwd(), 'server/model_specific_test.py');
      
      if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({
          success: false,
          error: `Test script not found at: ${scriptPath}`
        });
      }
      
      console.log(`MODEL TEST: Running ${provider} test for requirement ${requirementId}`);
      
      // Spawn the Python process with the requirement text
      const pythonProcess = spawn('python3', [
        scriptPath, 
        provider, 
        existingRequirement.requirement || requirementText
      ]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Set a timeout for the process
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        res.status(500).json({ 
          success: false,
          error: "Process timed out after 30 seconds" 
        });
      }, 30000);
      
      pythonProcess.on("close", async (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          console.error(`MODEL TEST: Process exited with code ${code}`);
          console.error("STDERR:", stderr);
          return res.status(500).json({ 
            success: false,
            error: `Processing failed with exit code ${code}`, 
            stderr
          });
        }
        
        try {
          // Parse the JSON output
          const result = JSON.parse(stdout);
          
          if (!result.success) {
            return res.status(500).json({
              success: false,
              error: result.error || "Unknown error in test script"
            });
          }
          
          // Extract fields based on provider
          let openaiResponse = null;
          let anthropicResponse = null;
          let deepseekResponse = null;
          let moaResponse = null;
          let finalResponse = result.generated_response || "";
          
          if (provider === "openai") {
            openaiResponse = result.openai_response || result.generated_response;
          } else if (provider === "anthropic") {
            anthropicResponse = result.anthropic_response || result.generated_response;
          } else if (provider === "moa") {
            moaResponse = result.moa_response || result.generated_response;
            openaiResponse = result.openai_response || null;
            anthropicResponse = result.anthropic_response || null;
          }
          
          console.log(`MODEL TEST: Generated ${provider} response (${finalResponse.length} chars)`);
          
          // Construct update object with all required fields
          const updateData = {
            // Core identification fields from existing requirement
            id: existingRequirement.id,
            requirement: existingRequirement.requirement,
            category: existingRequirement.category,
            rfpName: existingRequirement.rfpName,
            requirementId: existingRequirement.requirementId,
            uploadedBy: existingRequirement.uploadedBy,
            
            // Response fields
            finalResponse,
            openaiResponse,
            anthropicResponse,
            deepseekResponse,
            moaResponse,
            
            // Provider information
            modelProvider: provider,
            timestamp: new Date().toISOString()
          };
          
          console.log("MODEL TEST: Storage update data prepared with fields:", {
            modelProvider: updateData.modelProvider,
            finalResponseLength: updateData.finalResponse?.length || 0,
            openaiResponseLength: updateData.openaiResponse?.length || 0,
            anthropicResponseLength: updateData.anthropicResponse?.length || 0,
            moaResponseLength: updateData.moaResponse?.length || 0
          });
          
          // Save to database
          const savedResult = await storage.createResponseWithReferences(
            updateData,
            [] // No references for this test
          );
          
          return res.json({
            success: true,
            message: `Successfully generated and saved ${provider} response`,
            model_output: result,
            saved_data: savedResult.response
          });
          
        } catch (error) {
          console.error("MODEL TEST: Failed to parse Python output:", error);
          console.error("Raw output:", stdout.substring(0, 500) + "...");
          return res.status(500).json({ 
            success: false,
            error: error instanceof Error ? error.message : String(error),
            raw_output: stdout.substring(0, 1000)
          });
        }
      });
      
      pythonProcess.on("error", (error) => {
        clearTimeout(timeout);
        console.error("MODEL TEST: Failed to start Python process:", error);
        return res.status(500).json({ 
          success: false,
          error: `Failed to start Python process: ${error.message}` 
        });
      });
      
    } catch (error) {
      console.error("MODEL TEST: Error in endpoint:", error);
      return res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  console.log("Model-specific test endpoint added at /api/model-specific-test");
}