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
      const username = req.body.username || "default_user"; // Get username from request or use default
      
      if (!excelData || !Array.isArray(excelData)) {
        return res.status(400).json({ message: "Invalid Excel data format. Expected an array." });
      }
      
      // Convert Excel data to our database format
      const requirements = excelData.map(row => ({
        category: row.category || "Uncategorized",
        requirement: row.requirement || row.text || row.content || "",
        finalResponse: "",  // Initially empty
        username: username  // Add username to each record
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
      const { requirement, provider = "openai", requirementId } = req.body;
      
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
                  const savedData = await storage.createResponseWithReferences(
                    {
                      requirement: requirement,
                      finalResponse: result.generated_response || "Response could not be generated. Please try again.",
                      openaiResponse: result.openai_response || null,
                      anthropicResponse: result.anthropic_response || null,
                      deepseekResponse: result.deepseek_response || null,
                      category: existingRequirement?.category || '',
                      timestamp: new Date().toISOString(),
                      modelProvider: provider,
                      // If there was an existing requirement, update it instead of creating a new one
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

  const httpServer = createServer(app);
  return httpServer;
}
