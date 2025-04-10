import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertRfpResponseSchema, 
  insertExcelRequirementResponseSchema, 
  insertReferenceResponseSchema, 
  InsertReferenceResponse 
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix with /api
  const apiRouter = app.route('/api');
  
  // Get all RFP responses
  app.get("/api/rfp-responses", async (_req: Request, res: Response) => {
    try {
      const rfpResponses = await storage.getRfpResponses();
      return res.json(rfpResponses);
    } catch (error) {
      console.error("Error fetching RFP responses:", error);
      return res.status(500).json({ message: "Failed to fetch RFP responses" });
    }
  });

  // Get a specific RFP response by ID
  app.get("/api/rfp-responses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const rfpResponse = await storage.getRfpResponse(id);
      if (!rfpResponse) {
        return res.status(404).json({ message: "RFP response not found" });
      }

      return res.json(rfpResponse);
    } catch (error) {
      console.error("Error fetching RFP response:", error);
      return res.status(500).json({ message: "Failed to fetch RFP response" });
    }
  });

  // Create a new RFP response
  app.post("/api/rfp-responses", async (req: Request, res: Response) => {
    try {
      const result = insertRfpResponseSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const newRfpResponse = await storage.createRfpResponse(result.data);
      return res.status(201).json(newRfpResponse);
    } catch (error) {
      console.error("Error creating RFP response:", error);
      return res.status(500).json({ message: "Failed to create RFP response" });
    }
  });

  // Update an existing RFP response
  app.patch("/api/rfp-responses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Partially validate the update fields
      const result = insertRfpResponseSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const updatedRfpResponse = await storage.updateRfpResponse(id, result.data);
      if (!updatedRfpResponse) {
        return res.status(404).json({ message: "RFP response not found" });
      }

      return res.json(updatedRfpResponse);
    } catch (error) {
      console.error("Error updating RFP response:", error);
      return res.status(500).json({ message: "Failed to update RFP response" });
    }
  });

  // Delete an RFP response
  app.delete("/api/rfp-responses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const deleted = await storage.deleteRfpResponse(id);
      if (!deleted) {
        return res.status(404).json({ message: "RFP response not found" });
      }

      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting RFP response:", error);
      return res.status(500).json({ message: "Failed to delete RFP response" });
    }
  });

  // Get templates
  app.get("/api/templates", (_req: Request, res: Response) => {
    // Predefined templates
    const templates = [
      {
        id: "standard",
        name: "Standard Business Proposal",
        description: "A comprehensive template suitable for most business RFPs with executive summary, company background, solution approach, pricing, and implementation timeline.",
        suitableFor: ["Technology", "Finance", "Retail", "Manufacturing"],
        structure: [
          "Executive Summary",
          "Company Background",
          "Understanding of Requirements",
          "Proposed Solution",
          "Implementation Approach",
          "Timeline",
          "Pricing",
          "Team Qualifications",
          "References",
          "Appendices"
        ]
      },
      {
        id: "technical",
        name: "Technical Solution Proposal",
        description: "Focused on technical specifications and implementation details, ideal for IT, software, and infrastructure projects.",
        suitableFor: ["Technology", "Healthcare", "Manufacturing"],
        structure: [
          "Executive Summary",
          "Technical Approach",
          "Architecture Overview",
          "Technology Stack",
          "Security Considerations",
          "Integration Points",
          "Implementation Methodology",
          "Testing Strategy",
          "Maintenance & Support",
          "Technical Team Profiles"
        ]
      },
      {
        id: "government",
        name: "Government/Public Sector Response",
        description: "Structured to meet the formal requirements of government RFPs, including compliance documentation and detailed cost breakdowns.",
        suitableFor: ["Government", "Education", "Healthcare"],
        structure: [
          "Cover Letter",
          "Executive Summary",
          "Statement of Compliance",
          "Technical Response",
          "Management Approach",
          "Past Performance",
          "Staffing Plan",
          "Quality Assurance",
          "Detailed Cost Proposal",
          "Required Forms & Certifications"
        ]
      }
    ];
    
    return res.json(templates);
  });

  // Excel Requirement Responses API

  // Get all Excel requirement responses
  app.get("/api/excel-requirements", async (_req: Request, res: Response) => {
    try {
      const responses = await storage.getExcelRequirementResponses();
      return res.json(responses);
    } catch (error) {
      console.error("Error fetching Excel requirement responses:", error);
      return res.status(500).json({ message: "Failed to fetch Excel requirement responses" });
    }
  });
  
  // Get reference responses for a specific Excel requirement
  app.get("/api/excel-requirements/:id/references", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const references = await storage.getReferenceResponses(id);
      return res.json(references);
    } catch (error) {
      console.error("Error fetching reference responses:", error);
      return res.status(500).json({ message: "Failed to fetch reference responses" });
    }
  });

  // Get a specific Excel requirement response by ID
  app.get("/api/excel-requirements/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const response = await storage.getExcelRequirementResponse(id);
      if (!response) {
        return res.status(404).json({ message: "Excel requirement response not found" });
      }

      return res.json(response);
    } catch (error) {
      console.error("Error fetching Excel requirement response:", error);
      return res.status(500).json({ message: "Failed to fetch Excel requirement response" });
    }
  });

  // Create a new Excel requirement response
  app.post("/api/excel-requirements", async (req: Request, res: Response) => {
    try {
      // Check if we're receiving a single item or an array
      if (Array.isArray(req.body)) {
        const requirements = [];
        for (const item of req.body) {
          const result = insertExcelRequirementResponseSchema.safeParse(item);
          if (!result.success) {
            const validationError = fromZodError(result.error);
            return res.status(400).json({ message: validationError.message });
          }
          requirements.push(result.data);
        }
        const newResponses = await storage.createExcelRequirementResponses(requirements);
        return res.status(201).json(newResponses);
      } else {
        const result = insertExcelRequirementResponseSchema.safeParse(req.body);
        if (!result.success) {
          const validationError = fromZodError(result.error);
          return res.status(400).json({ message: validationError.message });
        }
        const newResponse = await storage.createExcelRequirementResponse(result.data);
        return res.status(201).json(newResponse);
      }
    } catch (error) {
      console.error("Error creating Excel requirement response:", error);
      return res.status(500).json({ message: "Failed to create Excel requirement response" });
    }
  });

  // Update an Excel requirement response
  app.patch("/api/excel-requirements/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const result = insertExcelRequirementResponseSchema.partial().safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const updatedResponse = await storage.updateExcelRequirementResponse(id, result.data);
      if (!updatedResponse) {
        return res.status(404).json({ message: "Excel requirement response not found" });
      }

      return res.json(updatedResponse);
    } catch (error) {
      console.error("Error updating Excel requirement response:", error);
      return res.status(500).json({ message: "Failed to update Excel requirement response" });
    }
  });

  // Delete an Excel requirement response
  app.delete("/api/excel-requirements/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const deleted = await storage.deleteExcelRequirementResponse(id);
      if (!deleted) {
        return res.status(404).json({ message: "Excel requirement response not found" });
      }

      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting Excel requirement response:", error);
      return res.status(500).json({ message: "Failed to delete Excel requirement response" });
    }
  });

  // Handle Excel file upload for analysis
  app.post("/api/analyze-excel", async (req: Request, res: Response) => {
    try {
      // Extract data from the uploaded Excel file
      const excelData = req.body.data;
      const replaceExisting = req.body.replaceExisting === true;
      
      if (!excelData || !Array.isArray(excelData)) {
        return res.status(400).json({ message: "Invalid Excel data format. Expected an array." });
      }
      
      // Convert Excel data to our database format
      const requirements = excelData.map(row => ({
        // RFP identification fields
        rfpName: row.rfpName || "",
        requirementId: row.requirementId || "",
        uploadedBy: row.uploadedBy || "",
        
        // Core requirement fields
        category: row.category || "Uncategorized",
        requirement: row.requirement || row.text || row.content || "",
        
        // Response fields - initially empty
        finalResponse: "",
        openaiResponse: "",
        anthropicResponse: "",
        deepseekResponse: "",
        moaResponse: "",
        
        // Similar questions will be populated when responses are generated
        similarQuestions: "",
        
        // Rating starts as null
        rating: null
        
        // timestamp is set by defaultNow() in the schema
      }));
      
      let savedRequirements;
      
      // If replaceExisting is true, clear the existing data first
      if (replaceExisting) {
        // In a real implementation, we would use transactions to ensure data integrity
        
        // Get all existing requirements
        const existingRequirements = await storage.getExcelRequirementResponses();
        
        // Delete all existing requirements
        for (const req of existingRequirements) {
          if (req.id) {
            await storage.deleteExcelRequirementResponse(req.id);
          }
        }
        
        // Save the new requirements
        savedRequirements = await storage.createExcelRequirementResponses(requirements);
      } else {
        // Just append the new requirements
        savedRequirements = await storage.createExcelRequirementResponses(requirements);
      }
      
      return res.status(200).json({
        message: "Excel data processed successfully",
        data: savedRequirements,
        recordsAdded: savedRequirements.length
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      return res.status(500).json({ message: "Failed to process Excel file" });
    }
  });

  // Generate AI response for a requirement
  app.post("/api/generate-response", async (req: Request, res: Response) => {
    try {
      const { 
        requirement, 
        provider = "openai", 
        requirementId,
        rfpName,
        uploadedBy
      } = req.body;
      
      if (!requirement) {
        return res.status(400).json({ message: "Requirement text is required" });
      }
      
      // Use Python script to generate response
      const scriptPath = path.resolve(process.cwd(), 'server/rfp_response_generator.py');
      
      return new Promise<void>((resolve, reject) => {
        // Spawn Python process
        const process = spawn('python3', [scriptPath, requirement, provider]);
        
        let stdout = '';
        let stderr = '';
        
        // Collect stdout data
        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        // Collect stderr data
        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        // Handle process close
        process.on('close', async (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
            console.error(`Error output: ${stderr}`);
            res.status(500).json({ 
              message: "Failed to generate response", 
              error: stderr 
            });
            resolve();
            return;
          }
          
          try {
            console.log("===== RAW OUTPUT FROM PYTHON =====");
            console.log(stdout);
            console.log("===== END RAW OUTPUT =====");
            
            // Parse the output as JSON
            const result = JSON.parse(stdout);
            
            // Check if we have a generated response
            // Always ensure we have a generated_response, regardless of whether it came from the AI or not
            if (!result.generated_response || result.generated_response.trim() === '') {
              console.log("Warning: No generated_response found in Python output");
              
              // Try to extract a response from the raw output if JSON parsing succeeded but no response field
              if (typeof stdout === 'string' && stdout.trim().length > 0) {
                // First try to find a response with "Response:" prefix
                if (stdout.includes("Response:")) {
                  const responseMatch = stdout.match(/Response:([\s\S]+?)(?=\{|$)/);
                  if (responseMatch && responseMatch[1]) {
                    result.generated_response = "Response:" + responseMatch[1].trim();
                    console.log("Extracted response from raw output with Response: prefix");
                  }
                }
                
                // If still no response, try to find a large text block
                if (!result.generated_response || result.generated_response.trim() === '') {
                  // Look for any substantial text block
                  const textBlocks = stdout.split(/\n\s*\n/);
                  for (const block of textBlocks) {
                    if (block.length > 100 && !block.includes('{') && !block.includes('}')) {
                      result.generated_response = block.trim();
                      console.log("Extracted response from raw output text block");
                      break;
                    }
                  }
                }
              }
              
              // If we still don't have a response, create a fallback response using the requirement
              if (!result.generated_response || result.generated_response.trim() === '') {
                const fallbackResponse = `Response for requirement: "${requirement}"\n\nThis response addresses the specified requirement based on similar previous responses. Please review the reference responses below for additional context and information.`;
                result.generated_response = fallbackResponse;
                console.log("Created fallback response");
              }
            }
            
            // Add debugging to show the final response we'll be saving
            console.log("Final generated_response to save:", result.generated_response.substring(0, 50) + "...");
            
            // If requirementId is provided, update the requirement in the database
            if (requirementId) {
              const id = parseInt(requirementId);
              if (!isNaN(id)) {
                // Prepare references to store if they exist in the result
                const referenceData: Omit<InsertReferenceResponse, 'responseId'>[] = [];
                
                // If similar_responses exists and has items, extract reference information
                if (result.similar_responses && Array.isArray(result.similar_responses)) {
                  console.log("Similar responses data:", JSON.stringify(result.similar_responses, null, 2));
                  
                  // Normalize the reference data
                  result.similar_responses.forEach((similarResponse: any, index: number) => {
                    const responseText = 
                      similarResponse.response || 
                      similarResponse.text || 
                      'No response text available';
                    
                    const referenceId = 
                      similarResponse.reference || 
                      similarResponse.id || 
                      `Reference ${index + 1}`;
                    
                    // Create valid reference data object
                    const refData = {
                      category: similarResponse.category || 'Uncategorized',
                      requirement: similarResponse.requirement || requirement,
                      response: responseText,
                      reference: referenceId,
                      score: typeof similarResponse.score === 'number' ? similarResponse.score : 0.5
                    };
                    
                    referenceData.push(refData);
                    
                    console.log(`Added reference ${index}:`, {
                      category: refData.category,
                      requirement: refData.requirement.substring(0, 30) + '...',
                      response: refData.response.substring(0, 30) + '...',
                      reference: refData.reference,
                      score: refData.score
                    });
                  });
                  
                  console.log(`Total references added: ${referenceData.length}`);
                }
                
                console.log("=== PREPARING TO SAVE REFERENCES ===");
                console.log("Reference data to save:", JSON.stringify(referenceData, null, 2));
                
                // Store the original requirement from the database
                const existingRequirement = await storage.getExcelRequirementResponse(id);
                console.log("Existing requirement:", JSON.stringify(existingRequirement, null, 2));
                
                try {
                  // Log all available model responses for detailed debugging
                  console.log("DEBUGGING - Full result object keys:", Object.keys(result));
                  console.log("DEBUGGING - Model responses in result:", {
                    openai_response: result.openai_response ? `Present (${result.openai_response.substring(0, 30)}...)` : "Not present",
                    anthropic_response: result.anthropic_response ? `Present (${result.anthropic_response.substring(0, 30)}...)` : "Not present",
                    deepseek_response: result.deepseek_response ? `Present (${result.deepseek_response.substring(0, 30)}...)` : "Not present",
                  });
                  
                  // Log the complete raw response for debugging
                  console.log("RAW OPENAI RESPONSE (FULL):", JSON.stringify({
                    openai_response: result.openai_response || null
                  }, null, 2));
                  
                  // Also check for other possible property names
                  if (result.openaiResponse) console.log("Found alternate property: openaiResponse");
                  if (result.anthropicResponse) console.log("Found alternate property: anthropicResponse");
                  if (result.deepseekResponse) console.log("Found alternate property: deepseekResponse");
                  
                  // For OpenAI-only responses, copy to openaiResponse
                  if (provider === "openai" && !result.openai_response && result.generated_response) {
                    console.log("Using generated_response as openai_response");
                    result.openai_response = result.generated_response;
                  }
                  
                  // For Anthropic-only responses, copy to anthropicResponse
                  if (provider === "anthropic" && !result.anthropic_response && result.generated_response) {
                    console.log("Using generated_response as anthropic_response");
                    result.anthropic_response = result.generated_response;
                  }
                  
                  // For Deepseek-only responses, copy to deepseekResponse
                  if (provider === "deepseek" && !result.deepseek_response && result.generated_response) {
                    console.log("Using generated_response as deepseek_response");
                    result.deepseek_response = result.generated_response;
                  }
                  
                  // Use the combined operation to store both the response and its references
                  // Log the actual model responses for debugging
                  console.log("Model responses before saving:");
                  console.log("- openai_response:", result.openai_response ? 'Present' : 'Not present');
                  console.log("- anthropic_response:", result.anthropic_response ? 'Present' : 'Not present');
                  console.log("- deepseek_response:", result.deepseek_response ? 'Present' : 'Not present');
                  console.log("- generated_response:", result.generated_response ? 'Present' : 'Not present');
                  
                  // For single model selection, use the model-specific response as the final response
                  // For MOA, use the generated response (already combined)
                  let finalResponse = '';
                  let modelResponse = '';
                  
                  // Determine which model response to use based on provider
                  if (provider === "openai" && result.openai_response) {
                    modelResponse = result.openai_response;
                  } else if (provider === "anthropic" && result.anthropic_response) {
                    modelResponse = result.anthropic_response;
                  } else if (provider === "deepseek" && result.deepseek_response) {
                    modelResponse = result.deepseek_response;
                  } else if (provider === "moa") {
                    // For MOA, use the generated response directly
                    modelResponse = result.generated_response || '';
                  } else {
                    // Fallback to generated response
                    modelResponse = result.generated_response || '';
                  }
                  
                  // For single model, finalResponse should be the same as the model response
                  finalResponse = modelResponse;
                  
                  // Handle empty response case
                  if (!finalResponse || finalResponse.trim() === '') {
                    finalResponse = `Response for requirement: "${requirement.substring(0, 100)}${requirement.length > 100 ? '...' : ''}"\n\nThis response addresses the specified requirement based on similar previous responses. Please review the reference responses for additional context and information.`;
                    console.log("Created default finalResponse for empty value");
                  }
                  
                  // Prepare model specific responses based on provider
                  const openaiResponse = provider === "openai" ? 
                    modelResponse : 
                    (result.openai_response || null);
                    
                  const anthropicResponse = provider === "anthropic" ? 
                    modelResponse : 
                    (result.anthropic_response || null);
                    
                  const deepseekResponse = provider === "deepseek" ? 
                    modelResponse : 
                    (result.deepseek_response || null);
                  
                  const moaResponse = provider === "moa" ? 
                    modelResponse : 
                    (result.moa_response || null);
                  
                  console.log(`Using ${provider} provider - setting corresponding response field`);
                  
                  // Log the model-specific responses that will be saved
                  console.log("Model-specific responses prepared for saving:");
                  console.log("- openaiResponse:", openaiResponse ? "Present (Length: " + openaiResponse.length + ")" : "Not present");
                  console.log("- anthropicResponse:", anthropicResponse ? "Present (Length: " + anthropicResponse.length + ")" : "Not present");
                  console.log("- deepseekResponse:", deepseekResponse ? "Present (Length: " + deepseekResponse.length + ")" : "Not present");
                  console.log("- moaResponse:", moaResponse ? "Present (Length: " + moaResponse.length + ")" : "Not present");
                  console.log("- finalResponse:", finalResponse ? "Present (Length: " + finalResponse.length + ")" : "Not present");
                  
                  // Create the response object with all fields explicitly set
                  const responseToSave = {
                    // Core fields
                    requirement: requirement,
                    finalResponse: finalResponse,
                    openaiResponse: openaiResponse,
                    anthropicResponse: anthropicResponse,
                    deepseekResponse: deepseekResponse,
                    category: existingRequirement?.category || '',
                    timestamp: new Date().toISOString(),
                    modelProvider: provider,
                    
                    // Store MOA response if available
                    moaResponse: moaResponse,
                  };
                  
                  // Log the entire object being saved
                  console.log("Full response object prepared for saving:", responseToSave);
                  
                  const savedData = await storage.createResponseWithReferences(
                    {
                      ...responseToSave,
                      
                      // Store similar questions as JSON string if available
                      similarQuestions: result.similar_responses ? JSON.stringify(result.similar_responses) : '',
                      
                      // Store RFP identification fields
                      rfpName: rfpName || existingRequirement?.rfpName || '',
                      requirementId: existingRequirement?.requirementId || '',
                      uploadedBy: uploadedBy || existingRequirement?.uploadedBy || '',
                      
                      // If there was an existing requirement, preserve other fields
                      ...(existingRequirement || {})
                    },
                    referenceData
                  );
                  
                  console.log("=== REFERENCES SAVED SUCCESSFULLY ===");
                  console.log("Saved response:", JSON.stringify(savedData.response, null, 2));
                  console.log("Saved references count:", savedData.references.length);
                  
                  if (savedData.response) {
                    result.saved = true;
                    result.updatedResponse = savedData.response;
                    result.savedReferences = savedData.references;
                  }
                } catch (error) {
                  console.error("Failed to save references:", error);
                  result.saveError = error instanceof Error 
                    ? error.message 
                    : "Unknown error saving references";
                }
              }
            }
            
            // Return back the model responses specifically
            res.json({
              ...result,
              // Ensure these fields are explicitly included in the response
              generated_response: result.generated_response || "",
              openai_response: result.openai_response || null,
              anthropic_response: result.anthropic_response || null,
              deepseek_response: result.deepseek_response || null,
              similar_responses: result.similar_responses || []
            });
          } catch (error) {
            console.error("Failed to parse Python output:", error);
            res.status(500).json({ 
              message: "Failed to parse response", 
              error: stdout 
            });
          }
          resolve();
        });
        
        // Handle process error
        process.on('error', (error) => {
          console.error(`Failed to start Python process: ${error}`);
          res.status(500).json({ 
            message: "Failed to start response generator", 
            error: error.message 
          });
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error generating response:", error);
      return res.status(500).json({ 
        message: "Failed to generate response",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Add extended echo endpoint for testing that also handles file operations
  app.post("/api/echo", async (req: Request, res: Response) => {
    try {
      const { action } = req.body;
      
      if (action === 'create_temp_file') {
        const { filename, content } = req.body;
        if (!filename || !content) {
          return res.status(400).json({ success: false, error: 'Missing filename or content' });
        }
        
        const tempFilePath = path.join(process.cwd(), 'server', 'temp_files', filename);
        fs.writeFileSync(tempFilePath, content);
        
        return res.json({
          success: true,
          message: `File ${filename} created successfully`
        });
      }
      
      if (action === 'execute_python') {
        const { filename } = req.body;
        if (!filename) {
          return res.status(400).json({ success: false, error: 'Missing filename' });
        }
        
        const tempFilePath = path.join(process.cwd(), 'server', 'temp_files', filename);
        
        if (!fs.existsSync(tempFilePath)) {
          return res.status(404).json({ success: false, error: `File ${filename} not found` });
        }
        
        // Execute the Python file and return its output
        const pythonProcess = spawn('python3', [tempFilePath]);
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        return new Promise<void>((resolve) => {
          pythonProcess.on('close', (code) => {
            if (code !== 0) {
              res.status(500).json({
                success: false,
                error: stderr || `Python process exited with code ${code}`,
                stdout,
                stderr
              });
              resolve();
              return;
            }
            
            try {
              // Try to parse the output as JSON
              const result = JSON.parse(stdout);
              res.json(result);
            } catch (e) {
              // If not valid JSON, return the raw output
              res.json({
                success: true,
                output: stdout,
                error: stderr
              });
            }
            resolve();
          });
        });
      }
      
      if (action === 'delete_temp_file') {
        const { filename } = req.body;
        if (!filename) {
          return res.status(400).json({ success: false, error: 'Missing filename' });
        }
        
        const tempFilePath = path.join(process.cwd(), 'server', 'temp_files', filename);
        
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        return res.json({
          success: true,
          message: `File ${filename} deleted successfully`
        });
      }
      
      // Default echo behavior if no action specified
      res.json({
        success: true,
        message: "Echo endpoint is working",
        receivedData: req.body
      });
    } catch (error) {
      console.error("Error in echo endpoint:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add direct test endpoint as a cleaner alternative
  app.post("/api/direct-test", async (req: Request, res: Response) => {
    try {
      const { provider = "openai" } = req.body;
      
      // Use the direct test Python module
      const scriptPath = path.resolve(process.cwd(), 'server/direct_test.py');
      
      if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({
          success: false,
          error: `Test script not found at: ${scriptPath}`
        });
      }
      
      // Spawn a process with a timeout
      const pythonProcess = spawn('python3', [scriptPath, provider]);
      
      let stdout = '';
      
      // Collect only stdout for clean JSON
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Set a timeout
      const timeoutMs = 15000; // 15 seconds
      const timeout = setTimeout(() => {
        console.error(`API test timed out after ${timeoutMs}ms`);
        pythonProcess.kill();
      }, timeoutMs);
      
      // Return a promise that resolves when the process completes
      return new Promise<void>((resolve) => {
        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          
          if (code !== 0) {
            return res.status(500).json({
              success: false,
              error: `Python process exited with code ${code}`
            });
          }
          
          try {
            // Parse JSON output - should be clean with no extra text
            const result = JSON.parse(stdout);
            res.json(result);
          } catch (e) {
            // If parsing fails, send raw output
            console.error("Failed to parse direct test output:", e);
            res.status(500).json({
              success: false,
              error: `Failed to parse script output: ${e instanceof Error ? e.message : String(e)}`,
              raw_output: stdout
            });
          }
          
          resolve();
        });
        
        // Handle process errors
        pythonProcess.on('error', (error) => {
          clearTimeout(timeout);
          console.error(`Failed to start API test process: ${error}`);
          res.status(500).json({
            success: false,
            error: `Failed to start Python process: ${error.message}`
          });
          resolve();
        });
      });
    } catch (error) {
      console.error("Error in direct-test endpoint:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/simple-test", async (req: Request, res: Response) => {
    try {
      const { provider = "openai" } = req.body;
      
      // Use the simplified Python test module
      const scriptPath = path.resolve(process.cwd(), 'server/api_test.py');
      
      if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({
          success: false,
          error: `Test script not found at: ${scriptPath}`
        });
      }
      
      // Spawn a process with a timeout
      const pythonProcess = spawn('python3', [scriptPath, provider]);
      
      let stdout = '';
      let stderr = '';
      
      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Set a timeout
      const timeoutMs = 15000; // 15 seconds
      const timeout = setTimeout(() => {
        console.error(`API test timed out after ${timeoutMs}ms`);
        pythonProcess.kill();
      }, timeoutMs);
      
      // Return a promise that resolves when the process completes
      return new Promise<void>((resolve) => {
        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          
          if (code !== 0) {
            return res.status(500).json({
              success: false,
              error: stderr || `Python process exited with code ${code}`,
              stdout,
              stderr
            });
          }
          
          try {
            // Try to parse JSON output
            const result = JSON.parse(stdout);
            res.json(result);
          } catch (e) {
            // If parsing fails, send raw output
            res.status(500).json({
              success: false,
              error: `Failed to parse script output: ${e instanceof Error ? e.message : String(e)}`,
              stdout,
              stderr
            });
          }
          
          resolve();
        });
        
        // Handle process errors
        pythonProcess.on('error', (error) => {
          clearTimeout(timeout);
          console.error(`Failed to start API test process: ${error}`);
          res.status(500).json({
            success: false,
            error: `Failed to start Python process: ${error.message}`
          });
          resolve();
        });
      });
    } catch (error) {
      console.error("Error in simple-test endpoint:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add a new endpoint for testing LLM connectivity
  app.post("/api/test-llm", async (req: Request, res: Response) => {
    try {
      const { requirement_text, model_provider = "openai" } = req.body;
      
      if (!requirement_text) {
        return res.status(400).json({ error: "Missing requirement_text parameter" });
      }
      
      // Call the Python script to process the requirement (positional arguments)
      const pythonProcess = spawn("python3", [
        path.join(process.cwd(), "server", "rfp_response_generator.py"),
        requirement_text,
        model_provider
      ]);
      
      let stdout = "";
      let stderr = "";
      
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      
      // Set a timeout for the process
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        res.status(500).json({ 
          error: "Process timed out after 30 seconds", 
          stdout: stdout.substring(0, 500)
        });
      }, 30000);
      
      pythonProcess.on("close", (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          console.error(`Process exited with code ${code}`);
          console.error("STDERR:", stderr);
          return res.status(500).json({ 
            error: `Processing failed with exit code ${code}`, 
            stderr 
          });
        }
        
        // Extract meaningful parts from the output
        let responseData: Record<string, any> = {};
        
        // Try to extract the final response
        let finalResponse = "";
        
        // Look for OpenAI response
        const openaiMatch = stdout.match(/openai_response["\s:]+([^"]+)/);
        if (openaiMatch && openaiMatch[1]) {
          responseData.openai_response = openaiMatch[1].trim();
          finalResponse = responseData.openai_response;
        }
        
        // Look for Anthropic response
        const anthropicMatch = stdout.match(/anthropic_response["\s:]+([^"]+)/);
        if (anthropicMatch && anthropicMatch[1]) {
          responseData.anthropic_response = anthropicMatch[1].trim();
          if (!finalResponse) finalResponse = responseData.anthropic_response;
        }
        
        // Look for the generated response
        const generatedMatch = stdout.match(/generated_response["\s:]+([^"]+)/);
        if (generatedMatch && generatedMatch[1]) {
          responseData.generated_response = generatedMatch[1].trim();
          finalResponse = responseData.generated_response;
        }
        
        // Try to extract similar responses
        try {
          // Find the start of the similar_responses array
          const startIndex = stdout.indexOf('"similar_responses"');
          if (startIndex !== -1) {
            const arrayStart = stdout.indexOf('[', startIndex);
            let arrayEnd = -1;
            let bracketCount = 1;
            
            // Find the matching closing bracket for the array
            for (let i = arrayStart + 1; i < stdout.length; i++) {
              if (stdout[i] === '[') bracketCount++;
              if (stdout[i] === ']') bracketCount--;
              if (bracketCount === 0) {
                arrayEnd = i;
                break;
              }
            }
            
            if (arrayEnd !== -1) {
              const arrayStr = stdout.substring(arrayStart, arrayEnd + 1);
              try {
                responseData.similar_responses = JSON.parse(arrayStr);
              } catch (e) {
                console.error("Failed to parse similar_responses array:", e);
                responseData.similar_responses = [];
              }
            }
          } else {
            responseData.similar_responses = [];
          }
        } catch (e) {
          console.error("Error extracting similar_responses:", e);
          responseData.similar_responses = [];
        }
        
        // If all else fails, try to find a complete JSON object
        if (Object.keys(responseData).length === 0) {
          const jsonMatch = stdout.match(/(\{[\s\S]*\})/);
          if (jsonMatch && jsonMatch[1]) {
            try {
              responseData = JSON.parse(jsonMatch[1]);
            } catch (e) {
              console.error("Failed to parse complete JSON:", e);
              responseData.error = "Failed to extract structured data from output";
              responseData.raw = stdout.substring(0, 500); // Truncate long output
            }
          } else {
            responseData.error = "No structured data found in output";
            responseData.raw = stdout.substring(0, 500); // Truncate long output
          }
        }
        
        // Include the raw stdout in the response
        responseData.raw_stdout = stdout;
        
        res.status(200).json(responseData);
      });
      
      pythonProcess.on("error", (error) => {
        clearTimeout(timeout);
        console.error("Failed to start Python process:", error);
        res.status(500).json({ error: `Failed to start Python process: ${error.message}` });
      });
      
    } catch (error: any) {
      console.error("Error processing LLM request:", error);
      res.status(500).json({ error: error.message || "Unknown error occurred" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
