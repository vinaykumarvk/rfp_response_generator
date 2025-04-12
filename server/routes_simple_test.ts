// Simplified routes module for testing model-specific response storage
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { storage } from './storage';

// Add a new endpoint for directly testing model-specific responses with no real API calls
export async function addSimpleTestEndpoint(app: any) {
  app.post("/api/simple-model-test", async (req: Request, res: Response) => {
    try {
      const { 
        provider = "openai", 
        requirementId,
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
      
      console.log(`SIMPLE TEST: Found requirement ${requirementId}`);
      
      // Use the simplified test script (no API calls)
      // Get the directory path directly
      const dirPath = path.join(process.cwd(), 'server');
      const scriptPath = path.join(dirPath, 'test_model_fix.py');
      
      if (!fs.existsSync(scriptPath)) {
        console.error(`SIMPLE TEST: Script not found at: ${scriptPath}`);
        return res.status(500).json({
          success: false,
          error: `Test script not found at: ${scriptPath}`
        });
      }
      
      console.log(`SIMPLE TEST: Using script at: ${scriptPath}`);
      
      console.log(`SIMPLE TEST: Running ${provider} test`);
      
      // Prepare environment variables for Python process
      const env = {
        ...process.env,
        // Explicitly pass API keys and other environment variables
        'OPENAI_API_KEY': process.env.OPENAI_API_KEY || '',
        'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY || '',
        'DEEPSEEK_API_KEY': process.env.DEEPSEEK_API_KEY || '',
        'DEBUG_MODE': 'true', // Enable verbose debugging
      };
      
      console.log(`SIMPLE TEST: Explicitly passing environment variables to Python process`);
      
      // Spawn the Python process with environment variables
      const pythonProcess = spawn('python3', [scriptPath, provider], { env });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on("close", async (code) => {
        if (code !== 0) {
          console.error(`SIMPLE TEST: Process exited with code ${code}`);
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
          
          // Extract model-specific response fields
          let openaiResponse = null;
          let anthropicResponse = null;
          let deepseekResponse = null;
          let moaResponse = null;
          let finalResponse = result.generated_response || "";
          
          // Map results based on provider
          if (provider === "openai") {
            openaiResponse = result.openai_response;
          } else if (provider === "anthropic") {
            anthropicResponse = result.anthropic_response;
          } else if (provider === "deepseek") {
            deepseekResponse = result.deepseek_response;
          } else if (provider === "moa") {
            moaResponse = result.moa_response;
            openaiResponse = result.openai_response;
            anthropicResponse = result.anthropic_response;
          }
          
          console.log(`SIMPLE TEST: Fields prepared for saving:`, {
            provider,
            openaiResponse: openaiResponse ? 'Present' : 'Not present',
            anthropicResponse: anthropicResponse ? 'Present' : 'Not present',
            deepseekResponse: deepseekResponse ? 'Present' : 'Not present',
            moaResponse: moaResponse ? 'Present' : 'Not present',
            finalResponse: finalResponse ? 'Present' : 'Not present'
          });
          
          // Construct update object with required fields
          const updateData = {
            id: existingRequirement.id,
            requirement: existingRequirement.requirement,
            category: existingRequirement.category,
            rfpName: existingRequirement.rfpName,
            requirementId: existingRequirement.requirementId,
            uploadedBy: existingRequirement.uploadedBy,
            
            // Set the response fields based on provider
            finalResponse: finalResponse,
            openaiResponse: openaiResponse,
            anthropicResponse: anthropicResponse,
            deepseekResponse: deepseekResponse,
            moaResponse: moaResponse,
            
            // Provider and timestamp
            modelProvider: provider,
            timestamp: new Date()
          };
          
          // Save to database using direct reference to storage
          const savedResult = await storage.updateExcelRequirementResponse(
            existingRequirement.id, 
            updateData
          );
          
          if (savedResult) {
            return res.json({
              success: true,
              message: `Successfully generated and saved ${provider} response`,
              model_output: result,
              saved_data: savedResult
            });
          } else {
            return res.status(500).json({
              success: false,
              error: "Failed to update requirement response"
            });
          }
          
        } catch (error) {
          console.error("SIMPLE TEST: Error parsing or saving data:", error);
          return res.status(500).json({ 
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
      
      pythonProcess.on("error", (error) => {
        console.error("SIMPLE TEST: Failed to start Python process:", error);
        return res.status(500).json({ 
          success: false,
          error: `Failed to start Python process: ${error.message}` 
        });
      });
      
    } catch (error) {
      console.error("SIMPLE TEST: Error in endpoint:", error);
      return res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  console.log("Simple model-specific test endpoint added at /api/simple-model-test");
}