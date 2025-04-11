import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertRfpResponseSchema, 
  insertExcelRequirementResponseSchema, 
  insertReferenceResponseSchema, 
  InsertReferenceResponse,
  type ReferenceResponse,
  type ExcelRequirementResponse
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { spawn, exec as execCallback } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { promisify } from "util";
import { sendEmail, createTempFile, fileToBase64Attachment } from "./email";

// Helper function for getting the directory path in ES modules
const getDirPath = () => {
  const currentFilePath = fileURLToPath(import.meta.url);
  return dirname(currentFilePath);
};

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
  
  // Save feedback for an Excel requirement response
  app.post("/api/excel-requirements/:id/feedback", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const { feedback } = req.body;
      if (typeof feedback !== 'string' || !['positive', 'negative'].includes(feedback)) {
        return res.status(400).json({ message: "Feedback must be 'positive' or 'negative'" });
      }
      
      // Get the existing response to ensure it exists
      const existingResponse = await storage.getExcelRequirementResponse(id);
      if (!existingResponse) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      // Update the response with feedback
      const updatedResponse = await storage.updateExcelRequirementResponse(id, { feedback });
      
      return res.json({ 
        success: true, 
        message: "Feedback saved successfully", 
        response: updatedResponse 
      });
    } catch (error) {
      console.error("Error saving feedback:", error);
      return res.status(500).json({ 
        message: "Failed to save feedback", 
        details: error instanceof Error ? error.message : String(error) 
      });
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
        uploadedBy,
        phase = 1, // Default to phase 1 for new requests
        modelResponses = null // Used in phase 2 for synthesis
      } = req.body;
      
      console.log(`Response generation request - Provider: ${provider}, Phase: ${phase}`);
      
      // Path for phase 2 of MOA (synthesis)
      if (provider === "moa" && phase === 2 && modelResponses) {
        try {
          console.log("Executing MOA Phase 2 - Synthesis");
          // Phase 2: Synthesize existing model responses
          // Launch Python script with a special flag for synthesis
          const scriptPath = path.join(getDirPath(), 'moa_synthesis.py');
          
          // Using hardcoded API keys in Python files - no need to pass API keys from environment
          const env = { 
            ...process.env,
            NODE_ENV: process.env.NODE_ENV || 'production'
          };
          
          // Create a temporary synthesis input file
          const synthInput = {
            requirement_text: requirement,
            model_responses: modelResponses,
            requirement_id: requirementId
          };
          
          const tempFilePath = path.join(getDirPath(), `temp_files/moa_synthesis_${Date.now()}.json`);
          fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
          fs.writeFileSync(tempFilePath, JSON.stringify(synthInput, null, 2));
          
          return new Promise<void>((resolve, reject) => {
            // Enhanced debugging for MOA synthesis using hardcoded keys
            console.log(`Using hardcoded API keys for MOA synthesis:`);
            console.log(`- OpenAI API Key: hardcoded in Python file`);
            console.log(`- Anthropic API Key: hardcoded in Python file`);
            console.log(`- DeepSeek API Key: hardcoded in Python file`);
            
            // Spawn Python process - no need to pass API keys as they are hardcoded
            const pythonEnv = { 
                ...process.env,
                NODE_ENV: process.env.NODE_ENV || 'production',
                DEBUG_MODE: 'true',
                DEPLOYMENT_ENV: process.env.REPL_ID ? 'replit' : 'local',
                USING_HARDCODED_KEYS: 'true'
            };
            
            // Spawn Python process for synthesis with env variables
            const synthesisProcess = spawn('python3', [
              scriptPath, 
              requirement,
              tempFilePath
            ], { env: pythonEnv });
            
            let stdout = '';
            let stderr = '';
            
            // Collect data from stdout
            synthesisProcess.stdout.on('data', (data) => {
              stdout += data.toString();
            });
            
            // Collect error output
            synthesisProcess.stderr.on('data', (data) => {
              stderr += data.toString();
              console.log(`Python synthesis stderr: ${data}`);
            });
            
            // Handle process completion
            synthesisProcess.on('close', async (code) => {
              console.log(`Python synthesis process exited with code ${code}`);
              
              // Clean up temp file
              try {
                fs.unlinkSync(tempFilePath);
              } catch (e) {
                console.error("Error removing temp file:", e);
              }
              
              if (code !== 0) {
                console.error(`Error: Python synthesis script exited with code ${code}`);
                console.error(`Stderr: ${stderr}`);
                res.status(500).json({ 
                  message: "Error generating synthesized response", 
                  error: stderr || "Unknown error"
                });
                return resolve();
              }
              
              try {
                // Parse the result from the Python script
                const result = JSON.parse(stdout.trim());
                
                if (result.error) {
                  console.error("Error in Python synthesis response:", result.error);
                  return res.status(500).json({ 
                    message: "Error generating synthesized response", 
                    error: result.error
                  });
                }
                
                // Get the existing requirement by ID
                const existingRequirement = await storage.getExcelRequirementResponse(Number(requirementId));
                
                if (!existingRequirement) {
                  console.error(`Requirement with ID ${requirementId} not found`);
                  return res.status(404).json({ message: "Requirement not found" });
                }
                
                // Update the moaResponse, finalResponse, and modelProvider fields
                const updatedResponse = await storage.updateExcelRequirementResponse(Number(requirementId), {
                  moaResponse: result.moa_response || result.generated_response,
                  finalResponse: result.moa_response || result.generated_response,
                  modelProvider: "moa" // Explicitly set the modelProvider to "moa"
                });
                
                if (!updatedResponse) {
                  console.error(`Failed to update synthesized response for requirement ID ${requirementId}`);
                  return res.status(500).json({ message: "Failed to update synthesized response" });
                }
                
                console.log(`Successfully updated synthesized response for requirement ID ${requirementId}`);
                
                // Return the updated response
                return res.status(200).json({
                  message: "MOA synthesis completed successfully",
                  response: updatedResponse,
                  phase: 2
                });
                
              } catch (error) {
                console.error("Error parsing Python synthesis output:", error);
                console.error("Raw stdout:", stdout);
                return res.status(500).json({ 
                  message: "Error parsing response from Python synthesis script", 
                  error: String(error)
                });
              }
            });
            
            // Handle process error
            synthesisProcess.on('error', (error) => {
              console.error(`Error spawning Python synthesis process: ${error}`);
              res.status(500).json({ 
                message: "Error spawning Python synthesis process", 
                error: error.message
              });
              resolve();
            });
          });
          
          return; // Return early for phase 2 processing
        } catch (error) {
          console.error("Error in MOA synthesis phase:", error);
          return res.status(500).json({ 
            message: "Error in MOA synthesis phase", 
            error: String(error)
          });
        }
      }
      
      if (!requirement) {
        return res.status(400).json({ message: "Requirement text is required" });
      }
      
      // Use PostgreSQL-based Python script to generate response
      const scriptPath = path.join(getDirPath(), 'rfp_response_generator_pg.py');
      console.log(`Using PostgreSQL-based generator script: ${scriptPath}`);
      
      return new Promise<void>((resolve, reject) => {
        // Enhanced debugging for environment variables in production
      console.log(`Using hardcoded API keys instead of environment variables:`);
      console.log(`- OpenAI API Key: hardcoded in Python file`);
      console.log(`- Anthropic API Key: hardcoded in Python file`);
      console.log(`- DeepSeek API Key: hardcoded in Python file`);
      
      // We're using hardcoded API keys in the Python files, so we don't need to pass them as environment variables
      console.log("Using hardcoded API keys in Python files for deployment");
      
      const pythonEnv = { 
        ...process.env,
        // We're not passing API keys anymore since they're hardcoded in Python
        NODE_ENV: process.env.NODE_ENV || 'production',
        DEBUG_MODE: 'true',
        DEPLOYMENT_ENV: process.env.REPL_ID ? 'replit' : 'local',
        USING_HARDCODED_KEYS: 'true',
        // Flag to indicate we're using PostgreSQL for vector search
        USING_PGVECTOR: 'true'
      };
      
      // Spawn Python process with PostgreSQL-based script
      const pythonProcess = spawn('python3', [scriptPath, requirement, provider], { env: pythonEnv });
        
        let stdout = '';
        let stderr = '';
        
        // Collect stdout data
        pythonProcess.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          console.log("PYTHON STDOUT CHUNK:", output.length <= 500 ? output : output.substring(0, 497) + "...");
        });
        
        // Collect stderr data
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        // Handle process close
        pythonProcess.on('close', async (code) => {
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
            
            // Clean the output - find the first '{' and the last '}' to extract only the JSON part
            let jsonStart = stdout.indexOf('{');
            let jsonEnd = stdout.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
              throw new Error("Invalid JSON structure in Python output");
            }
            
            // Extract only the JSON part of the output
            const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
            console.log("Extracted JSON:", jsonStr.substring(0, 100) + "...");
            
            // Parse the cleaned output as JSON
            const result = JSON.parse(jsonStr);
            
            // Handle MOA Phase 1 response specially
            if (provider === "moa" && result.phase === 1) {
              console.log("Processing MOA Phase 1 response");
              
              // Get the existing requirement by ID
              const existingRequirement = await storage.getExcelRequirementResponse(Number(requirementId));
              
              if (!existingRequirement) {
                console.error(`Requirement with ID ${requirementId} not found for MOA Phase 1`);
                return res.status(404).json({ message: "Requirement not found" });
              }
              
              // For MOA Phase 1, we want to store the individual responses
              const openaiResponse = result.openai_response || null;
              const anthropicResponse = result.anthropic_response || null;
              const deepseekResponse = result.deepseek_response || null;
              
              // Get today's date for the response timestamp
              const timestamp = new Date();
              
              // Log the model-specific responses
              console.log("MOA Phase 1 responses prepared for saving:");
              console.log("- openaiResponse:", openaiResponse ? "Present (Length: " + openaiResponse.length + ")" : "Not present");
              console.log("- anthropicResponse:", anthropicResponse ? "Present (Length: " + anthropicResponse.length + ")" : "Not present");
              console.log("- deepseekResponse:", deepseekResponse ? "Present (Length: " + deepseekResponse.length + ")" : "Not present");
              
              // Update the response in the database - don't set finalResponse yet for MOA phase 1
              const updatedResponse = await storage.updateExcelRequirementResponse(Number(requirementId), {
                requirement: existingRequirement.requirement,
                category: existingRequirement.category,
                rfpName: rfpName || existingRequirement.rfpName,
                uploadedBy: uploadedBy || existingRequirement.uploadedBy,
                openaiResponse: openaiResponse,
                anthropicResponse: anthropicResponse,
                deepseekResponse: deepseekResponse,
                // Don't set moaResponse or finalResponse yet for phase 1
                modelProvider: provider,
                rating: null  // Reset rating for the new response
              });
              
              if (!updatedResponse) {
                console.error(`Failed to update MOA phase 1 responses for requirement ID ${requirementId}`);
                return res.status(500).json({ message: "Failed to update MOA phase 1 responses" });
              }
              
              console.log(`Successfully updated MOA phase 1 responses for requirement ID ${requirementId}`);
              
              // Process similar responses for references
              let references: ReferenceResponse[] = [];
              if (result.similar_responses && Array.isArray(result.similar_responses)) {
                // Process and save references
                const referenceData = result.similar_responses.map((item: any) => ({
                  responseId: Number(requirementId),
                  category: item.category || '',
                  requirement: item.requirement || '',
                  response: item.response || '',
                  reference: item.reference || '',
                  score: item.score || 0
                }));
                
                // Save references
                try {
                  // Delete any existing references first
                  await storage.deleteReferenceResponsesByResponseId(Number(requirementId));
                  
                  // Create new references if we have any
                  if (referenceData.length > 0) {
                    references = await storage.createReferenceResponses(referenceData);
                  }
                  
                  console.log(`Saved ${references.length} references for MOA phase 1`);
                } catch (error) {
                  console.error("Error saving references for MOA phase 1:", error);
                }
              }
              
              // Check if we should auto-trigger Phase 2
              const autoTriggerPhase2 = !req.body.noAutoPhase2 && (result.synthesis_ready || false);
              
              if (autoTriggerPhase2) {
                console.log("Auto-triggering MOA Phase 2 synthesis...");
                
                try {
                  // Instead of returning the response, we'll trigger Phase 2 immediately
                  const scriptPath = path.join(getDirPath(), 'moa_synthesis.py');
                  
                  // Create a temporary synthesis input file
                  const synthInput = {
                    requirement_text: requirement,
                    model_responses: {
                      openaiResponse: openaiResponse,
                      anthropicResponse: anthropicResponse,
                      deepseekResponse: deepseekResponse
                    },
                    requirement_id: requirementId
                  };
                  
                  const tempFilePath = path.join(getDirPath(), `temp_files/moa_synthesis_${Date.now()}.json`);
                  fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
                  fs.writeFileSync(tempFilePath, JSON.stringify(synthInput, null, 2));
                  
                  // We're using hardcoded API keys in the Python files
                  console.log("Using hardcoded API keys in MOA Phase 2 Python file for deployment");
                  
                  // Spawn Python process with minimal environment variables
                  const pythonEnv = { 
                      ...process.env,
                      // We're not passing API keys anymore since they're hardcoded in Python
                      NODE_ENV: process.env.NODE_ENV || 'production',
                      DEBUG_MODE: 'true',
                      DEPLOYMENT_ENV: process.env.REPL_ID ? 'replit' : 'local',
                      USING_HARDCODED_KEYS: 'true'
                  };
                  
                  // Execute Phase 2 synthesis with env variables
                  const phase2Process = spawn('python3', [
                    scriptPath, 
                    requirement,
                    tempFilePath
                  ], { env: pythonEnv });
                  
                  let phase2Stdout = '';
                  let phase2Stderr = '';
                  
                  // Collect output
                  phase2Process.stdout.on('data', (data) => {
                    phase2Stdout += data.toString();
                  });
                  
                  phase2Process.stderr.on('data', (data) => {
                    phase2Stderr += data.toString();
                  });
                  
                  // Handle process completion
                  await new Promise<void>((resolve, reject) => {
                    phase2Process.on('close', async (code) => {
                      if (code !== 0) {
                        console.error(`Phase 2 process exited with code ${code}: ${phase2Stderr}`);
                        
                        // Even if Phase 2 fails, we'll still return the Phase 1 results
                        res.status(200).json({
                          message: "MOA phase 1 complete, but phase 2 synthesis failed",
                          response: updatedResponse,
                          references: references,
                          phase: 1,
                          synthesisReady: true,
                          modelResponses: {
                            openaiResponse: openaiResponse,
                            anthropicResponse: anthropicResponse,
                            deepseekResponse: deepseekResponse
                          },
                          error: phase2Stderr
                        });
                        resolve();
                        return;
                      }
                      
                      try {
                        console.log("Phase 2 stdout before parsing:", phase2Stdout.trim());
                        
                        // Parse Phase 2 result
                        const phase2Result = JSON.parse(phase2Stdout.trim());
                        console.log("Phase 2 result successfully parsed:", JSON.stringify(phase2Result, null, 2));
                        
                        // Update the response with the synthesized content
                        const moaResponse = phase2Result.moa_response || phase2Result.generated_response;
                        console.log("MOA response extracted:", moaResponse ? "Present" : "Not found");
                        
                        if (moaResponse) {
                          // Update response with synthesized content
                          const synthesizedResponse = await storage.updateExcelRequirementResponse(Number(requirementId), {
                            moaResponse: moaResponse,
                            finalResponse: moaResponse,
                            modelProvider: "moa" // Explicitly set the modelProvider to "moa"
                          });
                          
                          console.log(`Successfully completed phases 1 and 2 for requirement ID ${requirementId}`);
                          
                          // Return complete response with both phases
                          res.status(200).json({
                            message: "MOA phases 1 and 2 completed successfully",
                            response: synthesizedResponse,
                            references: references,
                            phase: 2
                          });
                        } else {
                          console.error("No MOA response found in Phase 2 output");
                          
                          // Return Phase 1 results if Phase 2 didn't produce a response
                          res.status(200).json({
                            message: "MOA phase 1 complete, but phase 2 didn't produce a response",
                            response: updatedResponse,
                            references: references,
                            phase: 1,
                            synthesisReady: true,
                            modelResponses: {
                              openaiResponse: openaiResponse,
                              anthropicResponse: anthropicResponse,
                              deepseekResponse: deepseekResponse
                            }
                          });
                        }
                      } catch (error) {
                        console.error("Error processing Phase 2 output:", error);
                        
                        // Return Phase 1 results if Phase 2 processing failed
                        res.status(200).json({
                          message: "MOA phase 1 complete, but phase 2 processing failed",
                          response: updatedResponse,
                          references: references,
                          phase: 1,
                          synthesisReady: true,
                          modelResponses: {
                            openaiResponse: openaiResponse,
                            anthropicResponse: anthropicResponse,
                            deepseekResponse: deepseekResponse
                          },
                          error: String(error)
                        });
                      }
                      
                      resolve();
                    });
                    
                    phase2Process.on('error', (error) => {
                      console.error(`Error launching Phase 2 process: ${error}`);
                      reject(error);
                    });
                  });
                  
                  // No need to return anything here as the response is handled in the callback
                  return;
                } catch (error) {
                  console.error("Error in auto Phase 2 processing:", error);
                  
                  // If auto-Phase 2 fails, fallback to returning Phase 1 results
                  return res.status(200).json({
                    message: "MOA phase 1 complete, auto-phase 2 failed",
                    response: updatedResponse,
                    references: references,
                    phase: 1,
                    synthesisReady: true,
                    modelResponses: {
                      openaiResponse: openaiResponse,
                      anthropicResponse: anthropicResponse,
                      deepseekResponse: deepseekResponse
                    },
                    error: String(error)
                  });
                }
              } else {
                // Standard Phase 1 response when not auto-triggering Phase 2
                return res.status(200).json({
                  message: "MOA phase 1 complete, ready for synthesis",
                  response: updatedResponse,
                  references: references,
                  phase: 1,
                  synthesisReady: result.synthesis_ready || false,
                  modelResponses: {
                    openaiResponse: openaiResponse,
                    anthropicResponse: anthropicResponse,
                    deepseekResponse: deepseekResponse
                  }
                });
              }
            }
            
            // IMPORTANT FIX: Debug the raw fields from Python to see what model-specific responses exist
            console.log("===== MODEL-SPECIFIC RESPONSE DEBUG =====");
            for (const key of Object.keys(result)) {
              if (typeof result[key] === 'string' && key.includes('_response')) {
                console.log(`Found Python response field: ${key} (${result[key].length} chars)`);
              }
            }
            // Explicitly check for known model-specific fields
            console.log("- openai_response:", result.openai_response ? `Present (${result.openai_response.length} chars)` : "Not present");
            console.log("- anthropic_response:", result.anthropic_response ? `Present (${result.anthropic_response.length} chars)` : "Not present");
            console.log("- deepseek_response:", result.deepseek_response ? `Present (${result.deepseek_response.length} chars)` : "Not present");
            console.log("- moa_response:", result.moa_response ? `Present (${result.moa_response.length} chars)` : "Not present");
            console.log("===== END MODEL-SPECIFIC DEBUG =====");
            
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
                    console.log("OPENAI RESPONSE FOUND, using it directly");
                    modelResponse = result.openai_response;
                  } else if (provider === "anthropic" && result.anthropic_response) {
                    console.log("ANTHROPIC RESPONSE FOUND, using it directly");
                    modelResponse = result.anthropic_response;
                  } else if (provider === "deepseek" && result.deepseek_response) {
                    console.log("DEEPSEEK RESPONSE FOUND, using it directly");
                    modelResponse = result.deepseek_response;
                  } else if (provider === "moa") {
                    // For MOA, use the generated response directly
                    console.log("MOA MODE, using generated_response");
                    modelResponse = result.generated_response || '';
                  } else {
                    // Fallback to generated response
                    console.log("NO MODEL-SPECIFIC RESPONSE FOUND, using generated_response as fallback");
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
                  
                  // DIRECT DEBUG: Log the raw values from result
                  console.log("DIRECT CHECK - RAW VALUES FROM PYTHON:");
                  console.log("- openai_response:", result.openai_response ? "Present and length " + result.openai_response.length : "Not present");
                  console.log("- generated_response:", result.generated_response ? "Present and length " + result.generated_response.length : "Not present");
                  
                  // Print the COMPLETE result object to identify all available fields
                  console.log("COMPLETE RESULT OBJECT DUMP:");
                  for (const key in result) {
                    try {
                      const value = result[key];
                      if (typeof value === 'string') {
                        console.log(`${key}: ${value.substring(0, 50)}... (${value.length} chars)`);
                      } else {
                        console.log(`${key}: ${JSON.stringify(value)}`);
                      }
                    } catch (e) {
                      console.log(`${key}: [Error stringifying]`, e);
                    }
                  }
                  
                  // USING FIELD MAPPING UTILITY FOR CONSISTENT NAMING
                  // Use our field mapping utility to handle Python response consistently
                  console.log("Preparing fields for mapping...");
                  
                  // First, gather all the model-specific responses from the result
                  const pythonResults = {
                    // Use only the data needed for field mapping
                    generated_response: result.generated_response || '',
                    openai_response: result.openai_response || '',
                    anthropic_response: result.anthropic_response || '',
                    deepseek_response: result.deepseek_response || '',
                    moa_response: result.moa_response || ''
                  };
                  
                  // Log what we found in the Python output
                  console.log("PYTHON OUTPUT FIELDS FOUND:");
                  for (const [key, value] of Object.entries(pythonResults)) {
                    if (value) {
                      console.log(`- ${key}: Present (${value.length} chars)`);
                    } else {
                      console.log(`- ${key}: Not present`);
                    }
                  }
                  
                  // Create a simple field mapping function that we can use without imports
                  // This is a simplified version of our field_mapping_fix.js module
                  // Using an immediately invoked function to avoid block-scoped function declaration issues
                  const mapFieldsDirectly = (pythonOutput: any, provider: string): { 
                    finalResponse: string | null;
                    openaiResponse: string | null;
                    anthropicResponse: string | null;
                    deepseekResponse: string | null;
                    moaResponse: string | null;
                  } => {
                    console.log("Mapping fields directly for provider:", provider);
                    
                    // Create the mapped fields object with default nulls
                    const mappedFields = {
                      finalResponse: null as string | null,
                      openaiResponse: null as string | null,
                      anthropicResponse: null as string | null,
                      deepseekResponse: null as string | null,
                      moaResponse: null as string | null
                    };
                    
                    // Set finalResponse from generated_response if available
                    if (pythonOutput.generated_response) {
                      mappedFields.finalResponse = pythonOutput.generated_response;
                      console.log(`Using generated_response as finalResponse (${pythonOutput.generated_response.length} chars)`);
                    }
                    
                    // Map model-specific responses based on provider
                    switch (provider) {
                      case "openai":
                        if (pythonOutput.openai_response) {
                          mappedFields.openaiResponse = pythonOutput.openai_response;
                          console.log(`Setting openai_response to openaiResponse (${pythonOutput.openai_response.length} chars)`);
                          
                          // Use as finalResponse if not already set
                          if (!mappedFields.finalResponse) {
                            mappedFields.finalResponse = pythonOutput.openai_response;
                            console.log("Using openai_response as finalResponse");
                          }
                        }
                        break;
                        
                      case "anthropic":
                        if (pythonOutput.anthropic_response) {
                          mappedFields.anthropicResponse = pythonOutput.anthropic_response;
                          console.log(`Setting anthropic_response to anthropicResponse (${pythonOutput.anthropic_response.length} chars)`);
                          
                          // Use as finalResponse if not already set
                          if (!mappedFields.finalResponse) {
                            mappedFields.finalResponse = pythonOutput.anthropic_response;
                            console.log("Using anthropic_response as finalResponse");
                          }
                        }
                        break;
                        
                      case "deepseek":
                        if (pythonOutput.deepseek_response) {
                          mappedFields.deepseekResponse = pythonOutput.deepseek_response;
                          console.log(`Setting deepseek_response to deepseekResponse (${pythonOutput.deepseek_response.length} chars)`);
                          
                          // Use as finalResponse if not already set
                          if (!mappedFields.finalResponse) {
                            mappedFields.finalResponse = pythonOutput.deepseek_response;
                            console.log("Using deepseek_response as finalResponse");
                          }
                        }
                        break;
                        
                      case "moa":
                        // For MOA, set all available responses
                        if (pythonOutput.openai_response) {
                          mappedFields.openaiResponse = pythonOutput.openai_response;
                          console.log(`Setting openai_response in MOA (${pythonOutput.openai_response.length} chars)`);
                        }
                        
                        if (pythonOutput.anthropic_response) {
                          mappedFields.anthropicResponse = pythonOutput.anthropic_response;
                          console.log(`Setting anthropic_response in MOA (${pythonOutput.anthropic_response.length} chars)`);
                        }
                        
                        if (pythonOutput.generated_response) {
                          mappedFields.moaResponse = pythonOutput.generated_response;
                          console.log(`Setting generated_response to moaResponse (${pythonOutput.generated_response.length} chars)`);
                        }
                        
                        // Ensure finalResponse is set
                        if (!mappedFields.finalResponse && (mappedFields.openaiResponse || mappedFields.anthropicResponse)) {
                          // Create a combined response if none exists
                          const combinedResponse = `## Combined MOA Response\n\n${mappedFields.openaiResponse ? `### OpenAI:\n${mappedFields.openaiResponse}\n\n` : ''}${mappedFields.anthropicResponse ? `### Anthropic:\n${mappedFields.anthropicResponse}` : ''}`;
                          // Use explicit typing for string assignment to null variables
                          mappedFields.finalResponse = combinedResponse as string;
                          mappedFields.moaResponse = combinedResponse as string;
                          console.log("Created combined response for MOA from individual responses");
                        }
                        break;
                    }
                    
                    // Log the final mapped fields
                    console.log("MAPPED FIELDS (After direct mapping):");
                    for (const [key, value] of Object.entries(mappedFields)) {
                      if (value) {
                        console.log(`- ${key}: Present (${(value as string).length} chars)`);
                      } else {
                        console.log(`- ${key}: Not present`);
                      }
                    }
                    
                    return mappedFields;
                  }
                  
                  // Perform the field mapping
                  const mappedFields = mapFieldsDirectly(pythonResults, provider);
                  
                  // Debug the contents of the mapped fields - these should have the correct values
                  console.log("MAPPED FIELDS DETAILED DEBUG:");
                  if (mappedFields.finalResponse) console.log("- finalResponse:", String(mappedFields.finalResponse).substring(0, 50) + "...");
                  if (mappedFields.openaiResponse) console.log("- openaiResponse:", String(mappedFields.openaiResponse).substring(0, 50) + "...");
                  if (mappedFields.anthropicResponse) console.log("- anthropicResponse:", String(mappedFields.anthropicResponse).substring(0, 50) + "...");
                  if (mappedFields.deepseekResponse) console.log("- deepseekResponse:", String(mappedFields.deepseekResponse).substring(0, 50) + "...");
                  if (mappedFields.moaResponse) console.log("- moaResponse:", String(mappedFields.moaResponse).substring(0, 50) + "...");
                  
                  // Create an explicit response object with ONLY the exact fields we need
                  const responseToSave = {
                    // Core fields
                    requirement: requirement,
                    category: existingRequirement?.category || '',
                    
                    // Response fields - use the mapped fields directly without any transformation
                    finalResponse: mappedFields.finalResponse || '',
                    openaiResponse: mappedFields.openaiResponse || null,
                    anthropicResponse: mappedFields.anthropicResponse || null,
                    deepseekResponse: mappedFields.deepseekResponse || null,
                    moaResponse: mappedFields.moaResponse || null,
                    
                    // Metadata
                    // Set current timestamp when a response is generated
                    timestamp: new Date().toISOString(),
                    // Make sure the modelProvider is correctly set to "moa" when using MOA approach
                    modelProvider: provider === "moa" || phase === 2 ? "moa" : provider,
                    
                    // RFP identification fields
                    rfpName: rfpName || existingRequirement?.rfpName || '',
                    requirementId: existingRequirement?.requirementId || '',
                    uploadedBy: uploadedBy || existingRequirement?.uploadedBy || '',
                    
                    // Similar questions
                    similarQuestions: result.similar_responses ? JSON.stringify(result.similar_responses) : '',
                    
                    // If this is an update, include the ID
                    ...(existingRequirement ? { id: existingRequirement.id } : {})
                  };
                  
                  // Log the entire object being saved
                  console.log("Response object prepared for saving:", {
                    requirement: responseToSave.requirement.substring(0, 50) + "...",
                    finalResponse: responseToSave.finalResponse ? responseToSave.finalResponse.substring(0, 50) + "..." : "Not set",
                    openaiResponse: responseToSave.openaiResponse ? `Present (${String(responseToSave.openaiResponse).length} chars)` : "Not set",
                    anthropicResponse: responseToSave.anthropicResponse ? `Present (${String(responseToSave.anthropicResponse).length} chars)` : "Not set",
                    deepseekResponse: responseToSave.deepseekResponse ? `Present (${String(responseToSave.deepseekResponse).length} chars)` : "Not set",
                    moaResponse: responseToSave.moaResponse ? `Present (${String(responseToSave.moaResponse).length} chars)` : "Not set"
                  });
                  
                  // DEBUG: Deep inspection of responseToSave to ensure all fields are correctly typed
                  console.log("MODEL RESPONSE FIELD DETAILED INSPECTION:");
                  console.log("- finalResponse type:", typeof responseToSave.finalResponse);
                  console.log("- openaiResponse type:", typeof responseToSave.openaiResponse);
                  console.log("- anthropicResponse type:", typeof responseToSave.anthropicResponse);
                  console.log("- deepseekResponse type:", typeof responseToSave.deepseekResponse);
                  console.log("- moaResponse type:", typeof responseToSave.moaResponse);
                  
                  try {
                    // Save the response with references
                    const savedData = await storage.createResponseWithReferences(
                      responseToSave,
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
                    console.error("Failed to save response and references:", error);
                    result.saveError = error instanceof Error 
                      ? error.message 
                      : "Unknown error saving response";
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
  // Create a test endpoint for directly testing the storage system with model responses
  app.post("/api/test-storage", async (req: Request, res: Response) => {
    try {
      const { openaiResponse, anthropicResponse, deepseekResponse, moaResponse, requirementId } = req.body;
      
      if (!requirementId) {
        return res.status(400).json({
          success: false,
          error: "Missing requirementId parameter"
        });
      }
      
      // Find the existing requirement to update
      const existingRequirements = await storage.getExcelRequirementResponses();
      const existingRequirement = existingRequirements.find(r => r.id === parseInt(requirementId));
      
      if (!existingRequirement) {
        return res.status(404).json({
          success: false,
          error: `Requirement with ID ${requirementId} not found`
        });
      }
      
      console.log("TEST ENDPOINT - Found requirement:", existingRequirement.id);
      
      // Determine which model to use based on what was provided
      let modelProvider = null;
      let finalResponse = '';
      
      if (openaiResponse) {
        modelProvider = "openai";
        finalResponse = openaiResponse;
        console.log("TEST - Using OpenAI response");
      } else if (anthropicResponse) {
        modelProvider = "anthropic";
        finalResponse = anthropicResponse;
        console.log("TEST - Using Anthropic response");
      } else if (deepseekResponse) {
        modelProvider = "deepseek";
        finalResponse = deepseekResponse;
        console.log("TEST - Using Deepseek response");
      } else if (moaResponse) {
        modelProvider = "moa";
        finalResponse = moaResponse;
        console.log("TEST - Using MOA response");
      } else {
        return res.status(400).json({
          success: false,
          error: "At least one model response must be provided"
        });
      }
      
      // Create simple update object with ONLY the necessary fields
      const updateData = {
        id: existingRequirement.id,
        requirement: existingRequirement.requirement,
        category: existingRequirement.category,
        rfpName: existingRequirement.rfpName,
        requirementId: existingRequirement.requirementId,
        uploadedBy: existingRequirement.uploadedBy,
        finalResponse,
        openaiResponse: openaiResponse || null,
        anthropicResponse: anthropicResponse || null,
        deepseekResponse: deepseekResponse || null,
        moaResponse: moaResponse || null,
        modelProvider,
        // Set current timestamp when testing as well
        timestamp: new Date().toISOString()
      };
      
      console.log("TEST - Direct storage update with:", {
        id: updateData.id,
        modelProvider: updateData.modelProvider,
        finalResponseLength: updateData.finalResponse?.length || 0,
        openaiResponseLength: updateData.openaiResponse?.length || 0, 
        anthropicResponseLength: updateData.anthropicResponse?.length || 0,
        deepseekResponseLength: updateData.deepseekResponse?.length || 0,
        moaResponseLength: updateData.moaResponse?.length || 0
      });

      // Use storage directly without any intermediate processing
      const result = await storage.createResponseWithReferences(
        updateData,
        [] // No references for this test
      );
      
      return res.json({
        success: true,
        message: "Storage test completed successfully",
        updatedResponse: result.response
      });
      
    } catch (error) {
      console.error("Error in test-storage endpoint:", error);
      return res.status(500).json({
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

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
  app.post("/api/test-field-mapping", async (req: Request, res: Response) => {
    try {
      // Import our field mapping module directly here
      // This will be cleaner than spawning a separate process
      import('./field_mapping_fix.js')
        .then(({ mapPythonResponseToDbFields }) => {
          // Sample responses to test
          const testResponses = [
            {
              provider: "openai",
              input: {
                provider: "openai",
                generated_response: "This is a generated response from OpenAI",
                openai_response: "This is the OpenAI response field content",
                similar_responses: []
              }
            },
            {
              provider: "anthropic",
              input: {
                provider: "anthropic",
                generated_response: "This is a generated response from Anthropic",
                anthropic_response: "This is the Anthropic response field content",
                similar_responses: []
              }
            },
            {
              provider: "moa",
              input: {
                provider: "moa",
                generated_response: "This is a combined MOA response",
                openai_response: "This is the OpenAI part of MOA",
                anthropic_response: "This is the Anthropic part of MOA",
                similar_responses: []
              }
            }
          ];
          
          // Process each test and collect results
          const results = testResponses.map(test => {
            const mapped = mapPythonResponseToDbFields(test.input, test.provider);
            return {
              provider: test.provider,
              input: test.input,
              output: mapped
            };
          });
          
          return res.json({
            success: true,
            message: "Field mapping tests completed successfully",
            results
          });
        })
        .catch(error => {
          console.error("Error importing field mapping module:", error);
          return res.status(500).json({
            success: false,
            error: `Failed to import field mapping module: ${error instanceof Error ? error.message : String(error)}`
          });
        });
    } catch (error) {
      console.error("Error testing field mapping:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/direct-test", async (req: Request, res: Response) => {
    try {
      const { provider = "openai" } = req.body;
      
      // Use the direct test Python module
      const scriptPath = path.join(getDirPath(), 'direct_test.py');
      
      if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({
          success: false,
          error: `Test script not found at: ${scriptPath}`
        });
      }
      
      // Prepare environment variables for Python process
      const pythonEnv = {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'production',
        DEBUG_MODE: 'true',
        DEPLOYMENT_ENV: process.env.REPL_ID ? 'replit' : 'local'
      };

      // Spawn a process with environment variables and timeout
      const pythonProcess = spawn('python3', [scriptPath, provider], { env: pythonEnv });
      
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
      const scriptPath = path.join(getDirPath(), 'api_test.py');
      
      if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({
          success: false,
          error: `Test script not found at: ${scriptPath}`
        });
      }
      
      // Prepare environment variables for Python process
      const pythonEnv = {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'production',
        DEBUG_MODE: 'true',
        DEPLOYMENT_ENV: process.env.REPL_ID ? 'replit' : 'local'
      };
      
      // Spawn a process with environment variables and timeout
      const pythonProcess = spawn('python3', [scriptPath, provider], { env: pythonEnv });
      
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
  app.get("/api/test-moa", async (_req: Request, res: Response) => {
    try {
      console.log("Running MOA response test...");
      
      // Run the test script directly via spawn
      const { spawn } = await import('child_process');
      
      const nodeProcess = spawn('node', ['server/direct_moa_test.js'], {
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      
      nodeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      nodeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      nodeProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`MOA Test process exited with code ${code}`);
          return res.status(500).json({
            message: "MOA Response Test failed",
            error: `Process exited with code ${code}`,
            stderr
          });
        }
        
        try {
          // Parse the results from the JSON at the end of stdout
          const resultsMatch = stdout.match(/\{[\s\S]*\}$/);
          const results = resultsMatch ? JSON.parse(resultsMatch[0]) : { error: "Could not parse test results" };
          
          // Return the results with the full output
          return res.status(200).json({
            message: "MOA Response Test completed",
            results,
            output: stdout
          });
        } catch (parseError: any) {
          return res.status(500).json({
            message: "Failed to parse test results",
            error: parseError.message,
            output: stdout
          });
        }
      });
      
      nodeProcess.on('error', (error) => {
        console.error("Error spawning node process:", error);
        return res.status(500).json({
          message: "Failed to run MOA test script",
          error: error.message
        });
      });
    } catch (error: any) {
      console.error("Error running MOA response test:", error);
      return res.status(500).json({ error: error.message || "Unknown error occurred" });
    }
  });
  
  app.get("/api/fix-moa-responses", async (_req: Request, res: Response) => {
    try {
      console.log("Fixing MOA responses...");
      
      // Run the fix script directly via spawn
      const { spawn } = await import('child_process');
      
      const nodeProcess = spawn('node', ['server/fix_moa_responses.js'], {
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      
      nodeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      nodeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      nodeProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`MOA Fix process exited with code ${code}`);
          return res.status(500).json({
            message: "MOA Response fix failed",
            error: `Process exited with code ${code}`,
            stderr
          });
        }
        
        try {
          // Parse the results from the JSON at the end of stdout
          const resultsMatch = stdout.match(/\{[\s\S]*\}$/);
          const results = resultsMatch ? JSON.parse(resultsMatch[0]) : { error: "Could not parse fix results" };
          
          // Return the results with the full output
          return res.status(200).json({
            message: "MOA Response fix completed",
            results,
            output: stdout
          });
        } catch (parseError: any) {
          return res.status(500).json({
            message: "Failed to parse fix results",
            error: parseError.message,
            output: stdout
          });
        }
      });
      
      nodeProcess.on('error', (error) => {
        console.error("Error spawning node process:", error);
        return res.status(500).json({
          message: "Failed to run MOA fix script",
          error: error.message
        });
      });
    } catch (error: any) {
      console.error("Error fixing MOA responses:", error);
      return res.status(500).json({ error: error.message || "Unknown error occurred" });
    }
  });
  
  app.get("/api/generate-test-moa", async (_req: Request, res: Response) => {
    try {
      console.log("Generating a test MOA response...");
      
      // Import necessary modules
      const { Pool, neonConfig } = await import('@neondatabase/serverless');
      const ws = await import('ws');
      const { spawn } = await import('child_process');
      
      // Configure database connection
      neonConfig.webSocketConstructor = ws.default;
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      try {
        // First, get a requirement ID to use
        const requirement = await pool.query(`
          SELECT id, requirement FROM excel_requirement_responses 
          ORDER BY id DESC LIMIT 1
        `);
        
        if (requirement.rowCount === 0) {
          await pool.end();
          return res.status(404).json({ error: "No requirements found to test with" });
        }
        
        const { id, requirement: reqText } = requirement.rows[0];
        await pool.end(); // Close database connection
        
        // Use the generate-response endpoint
        console.log(`Using requirement ID ${id} for MOA test`);
        
        // Create payload for the API call
        const payload = JSON.stringify({
          requirementId: id,
          requirement: reqText,
          provider: "moa"
        });
        
        // Use curl process to call the API
        const curlProcess = spawn('curl', [
          '-X', 'POST',
          'http://localhost:5000/api/generate-response',
          '-H', 'Content-Type: application/json',
          '-d', payload
        ]);
        
        let apiStdout = '';
        let apiStderr = '';
        
        curlProcess.stdout.on('data', (data) => {
          apiStdout += data.toString();
        });
        
        curlProcess.stderr.on('data', (data) => {
          apiStderr += data.toString();
        });
        
        curlProcess.on('close', async (code) => {
          if (code !== 0) {
            console.error(`API call process exited with code ${code}`);
            return res.status(500).json({
              message: "Failed to call generate-response API",
              error: `Process exited with code ${code}`,
              stderr: apiStderr
            });
          }
          
          console.log("API call succeeded, waiting for MOA Phase 2 to complete...");
          
          try {
            // Wait for Phase 2 to complete
            await new Promise(r => setTimeout(r, 5000));
            
            // Run the test script to verify the MOA response
            const testProcess = spawn('node', ['server/direct_moa_test.js'], {
              env: process.env
            });
            
            let testStdout = '';
            let testStderr = '';
            
            testProcess.stdout.on('data', (data) => {
              testStdout += data.toString();
            });
            
            testProcess.stderr.on('data', (data) => {
              testStderr += data.toString();
            });
            
            testProcess.on('close', (testCode) => {
              if (testCode !== 0) {
                console.error(`MOA Test process exited with code ${testCode}`);
                return res.status(500).json({
                  message: "Error testing MOA response after generation",
                  error: `Test process exited with code ${testCode}`,
                  stderr: testStderr
                });
              }
              
              return res.status(200).json({
                message: "MOA test response generation and verification completed",
                apiResponse: apiStdout,
                testResults: testStdout
              });
            });
            
            testProcess.on('error', (testError) => {
              console.error("Error spawning test process:", testError);
              return res.status(500).json({
                message: "Failed to run MOA test script",
                error: testError.message
              });
            });
          } catch (postError: any) {
            return res.status(500).json({
              message: "Error after generating MOA response",
              error: postError.message
            });
          }
        });
        
        curlProcess.on('error', (error) => {
          console.error("Error spawning curl process:", error);
          return res.status(500).json({
            message: "Failed to run curl command",
            error: error.message
          });
        });
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        try {
          await pool.end();
        } catch (e) { /* Ignore cleanup errors */ }
        
        return res.status(500).json({
          message: "Error accessing database",
          error: dbError.message
        });
      }
    } catch (error: any) {
      console.error("Error generating test MOA response:", error);
      return res.status(500).json({ error: error.message || "Unknown error occurred" });
    }
  });
  
  app.post("/api/test-llm", async (req: Request, res: Response) => {
    try {
      const { requirement_text, modelProvider = "openai" } = req.body;
      
      if (!requirement_text) {
        return res.status(400).json({ error: "Missing requirement_text parameter" });
      }
      
      // Prepare environment variables for Python process
      const pythonEnv = {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'production',
        DEBUG_MODE: 'true',
        DEPLOYMENT_ENV: process.env.REPL_ID ? 'replit' : 'local'
      };
      
      console.log("Starting LLM test with environment:", {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `Present (${process.env.OPENAI_API_KEY.substring(0, 5)}...)` : 'Not present',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? `Present (${process.env.ANTHROPIC_API_KEY.substring(0, 5)}...)` : 'Not present',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? `Present (${process.env.DEEPSEEK_API_KEY.substring(0, 5)}...)` : 'Not present'
      });
      
      // Call the PostgreSQL-based Python script to process the requirement (positional arguments)
      const pythonProcess = spawn("python3", [
        path.join(getDirPath(), "rfp_response_generator_pg.py"),
        requirement_text,
        modelProvider
      ], { env: pythonEnv });
      
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

  // API endpoint for sending emails with attachments via SendGrid
  app.post("/api/send-email", async (req: Request, res: Response) => {
    try {
      const { 
        to, 
        subject, 
        markdownContent,
        filename = "rfp-responses.md" 
      } = req.body;
      
      if (!to || !subject || !markdownContent) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields (to, subject, and markdownContent)" 
        });
      }

      // Create a temporary file with the markdown content
      const tempFilePath = createTempFile(markdownContent, filename);
      
      // Convert the file to a base64 attachment for SendGrid
      const attachment = fileToBase64Attachment(tempFilePath, filename);
      
      // Send the email with the attachment
      // Per user request: Use markdown text in the email body, not HTML
      const result = await sendEmail({
        to,
        subject,
        text: markdownContent, // Use markdown text as email body
        attachments: [attachment]
      });
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ 
        success: false, 
        message: `Failed to send email: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Enhanced debug endpoint to report API key status
  app.get("/api/check-keys", async (_req: Request, res: Response) => {
    try {
      // We're using hardcoded API keys in the Python files
      const openaiKeyAvailable = true; // Hardcoded in Python files
      const anthropicKeyAvailable = true; // Hardcoded in Python files
      const deepseekKeyAvailable = true; // Hardcoded in Python files
      const databaseUrlAvailable = !!process.env.DATABASE_URL;
      const sendgridKeyAvailable = !!process.env.SENDGRID_API_KEY;
      
      // Get Node.js and runtime information for diagnostics
      const nodeVersion = process.version;
      const platform = process.platform;
      const isReplit = !!process.env.REPL_ID;
      const replId = process.env.REPL_ID || 'Not in Replit';
      const replSlug = process.env.REPL_SLUG || 'Not in Replit';
      
      // Try to check Python version
      let pythonVersion = 'Unknown';
      let pythonDeps: Record<string, any> = {
        status: 'Unknown'
      };
      
      try {
        // Attempt to get Python version
        const { spawn } = await import('child_process');
        const pythonProcess = spawn('python3', ['--version']);
        
        // Collect version info
        let versionOutput = '';
        pythonProcess.stdout.on('data', (data) => {
          versionOutput += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          versionOutput += data.toString();
        });
        
        // Wait for process to complete
        await new Promise<void>((resolve) => {
          pythonProcess.on('close', () => {
            pythonVersion = versionOutput.trim() || 'Not detected';
            resolve();
          });
        });
        
        // Check Python dependencies
        const depCheckProcess = spawn('python3', ['-c', "import sys; import json; deps = {'openai': True, 'anthropic': True, 'numpy': True, 'pandas': True}; for dep in list(deps.keys()): try: __import__(dep); deps[dep] = True; except ImportError: deps[dep] = False; print(json.dumps(deps))"]);
        
        let depOutput = '';
        depCheckProcess.stdout.on('data', (data) => {
          depOutput += data.toString();
        });
        
        // Wait for process to complete
        await new Promise<void>((resolve) => {
          depCheckProcess.on('close', () => {
            try {
              pythonDeps = JSON.parse(depOutput.trim());
              pythonDeps.status = 'Checked';
            } catch (e) {
              pythonDeps = {
                status: 'Check failed',
                output: depOutput
              };
            }
            resolve();
          });
        });
      } catch (e) {
        console.error("Error checking Python:", e);
        pythonVersion = `Error checking: ${String(e)}`;
      }
      
      // Create a comprehensive diagnostic result
      const diagnostics = {
        environment: process.env.NODE_ENV || 'unknown',
        apiKeys: {
          openaiKeyAvailable,
          anthropicKeyAvailable,
          deepseekKeyAvailable,
          sendgridKeyAvailable,
          openaiKeyHint: "sk-cw...WJK", // Hardcoded in Python files
          anthropicKeyHint: "sk-an...wAA", // Hardcoded in Python files
          deepseekKeyHint: "sk-83...941", // Hardcoded in Python files
        },
        database: {
          databaseUrlAvailable,
          postgresHostAvailable: !!process.env.PGHOST,
          postgresUserAvailable: !!process.env.PGUSER,
          postgresDbAvailable: !!process.env.PGDATABASE,
          postgresPassAvailable: !!process.env.PGPASSWORD ? true : false,
          postgresPortAvailable: !!process.env.PGPORT
        },
        nodeSystem: {
          nodeVersion,
          platform,
          arch: process.arch,
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          cwd: process.cwd()
        },
        replit: {
          isReplit,
          replId,
          replSlug,
          owner: process.env.REPL_OWNER || 'Unknown',
          envVarsCount: Object.keys(process.env).length
        },
        python: {
          version: pythonVersion,
          dependencies: pythonDeps
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(diagnostics);
    } catch (error) {
      console.error("Error checking API keys:", error);
      res.status(500).json({ message: "Error checking API keys", error: String(error) });
    }
  });
  
  // Python environment validator endpoint
  app.get("/api/validate-python-env", async (_req: Request, res: Response) => {
    try {
      const pythonScript = path.join(process.cwd(), "server", "deployment_validator.py");
      
      if (!fs.existsSync(pythonScript)) {
        return res.status(404).json({ 
          error: "Python validator script not found", 
          path: pythonScript 
        });
      }
      
      const pythonProcess = spawn("python3", [pythonScript]);
      let stdout = "";
      let stderr = "";
      
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          return res.status(500).json({
            error: "Python validator failed",
            code,
            stderr
          });
        }
        
        try {
          const results = JSON.parse(stdout);
          res.json(results);
        } catch (e) {
          res.status(500).json({
            error: "Failed to parse Python validator output",
            stdout,
            parseError: String(e)
          });
        }
      });
    } catch (error) {
      console.error("Error running Python validator:", error);
      res.status(500).json({ 
        message: "Error running Python validator", 
        error: String(error) 
      });
    }
  });
  
  // Shell script deployment verification endpoint
  app.get("/api/shell-verify", async (_req: Request, res: Response) => {
    try {
      const scriptPath = path.join(process.cwd(), "server", "deploy_checks.sh");
      
      if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({ 
          error: "Deployment verification script not found", 
          path: scriptPath 
        });
      }
      
      const exec = promisify(execCallback);
      const { stdout, stderr } = await exec(`bash ${scriptPath}`);
      
      // Parse the output to extract key information
      const summary = {
        timestamp: new Date().toISOString(),
        success: stdout.includes("All basic deployment requirements are met"),
        output: stdout,
        errors: stderr || null,
        missingFiles: (stdout.match(/Warning: (\d+) critical files are missing/)?.[1] || "0"),
        missingModules: (stdout.match(/Warning: (\d+) Python modules are missing/)?.[1] || "0"),
        missingKeys: (stdout.match(/Warning: (\d+) API keys are not set/)?.[1] || "0"),
        embeddingsValid: stdout.includes("Embeddings file is valid pickle"),
        dbConnectionSuccess: stdout.includes("Database connection successful")
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error running deployment verification script:", error);
      res.status(500).json({ 
        message: "Error running deployment verification script", 
        error: String(error) 
      });
    }
  });
  
  // Comprehensive deployment check endpoint
  app.get("/api/deployment-check", async (_req: Request, res: Response) => {
    try {
      const exec = promisify(execCallback);
      
      // Basic environment info
      const baseDir = process.cwd();
      const deploymentInfo: any = {
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        paths: {
          cwd: baseDir
        },
        files: {},
        api_keys: {},
        python_modules: {},
        deployment_platform: "Replit"
      };
      
      // Check important files
      const filesToCheck = [
        'rfp_embeddings.pkl',
        'attached_assets/previous_responses.xlsx',
        'server/rfp_response_generator_pg.py',
        'server/moa_synthesis.py',
        'server/direct_test.py',
        'server/api_test.py',
        'server/pg_vector_search.py',
        '.env.production'
      ];
      
      filesToCheck.forEach(file => {
        const fullPath = path.join(baseDir, file);
        try {
          const exists = fs.existsSync(fullPath);
          let size = 'N/A';
          let permissions = 'N/A';
          
          if (exists) {
            const stats = fs.statSync(fullPath);
            size = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
            permissions = stats.mode.toString(8).slice(-3);
          }
          
          deploymentInfo.files[file] = { exists, size, permissions };
        } catch (err: any) {
          deploymentInfo.files[file] = { exists: false, error: err.message };
        }
      });
      
      // Check API keys (only presence, not the actual values)
      const apiKeys = {
        'OPENAI_API_KEY': !!process.env.OPENAI_API_KEY,
        'ANTHROPIC_API_KEY': !!process.env.ANTHROPIC_API_KEY,
        'DEEPSEEK_API_KEY': !!process.env.DEEPSEEK_API_KEY,
        'SENDGRID_API_KEY': !!process.env.SENDGRID_API_KEY
      };
      deploymentInfo.api_keys = apiKeys;
      
      // Add Python version and module checks
      try {
        const { stdout: pythonVersion } = await exec('python3 --version');
        deploymentInfo.python = { version: pythonVersion.trim() };
        
        // Check for critical Python modules
        const modulesToCheck = ['openai', 'anthropic', 'pandas', 'numpy', 'sklearn', 'gdown'];
        for (const module of modulesToCheck) {
          try {
            const { stdout } = await exec(`python3 -c "import ${module}; print('${module} is available')" 2>/dev/null || echo "${module} is not available"`);
            deploymentInfo.python_modules[module] = stdout.trim().includes('available');
          } catch (err) {
            deploymentInfo.python_modules[module] = false;
          }
        }
      } catch (err: any) {
        deploymentInfo.python = { error: err.message };
      }
      
      // Check for alternative pickle file paths
      const altPaths = [
        "/home/runner/rfp-embeddings/rfp_embeddings.pkl",
        "/home/runner/workspace/rfp_embeddings.pkl",
        "/tmp/rfp_embeddings.pkl"
      ];
      
      deploymentInfo.alt_embeddings_paths = {};
      altPaths.forEach(p => {
        try {
          const exists = fs.existsSync(p);
          deploymentInfo.alt_embeddings_paths[p] = {
            exists,
            size: exists ? `${(fs.statSync(p).size / (1024*1024)).toFixed(2)} MB` : "File not found"
          };
        } catch (err) {
          deploymentInfo.alt_embeddings_paths[p] = { exists: false, error: 'Error checking path' };
        }
      });
      
      // Check ports and network
      try {
        const { stdout: netstat } = await exec('netstat -tulpn 2>/dev/null || echo "netstat not available"');
        deploymentInfo.network = { 
          ports_in_use: netstat.includes('netstat not available') ? 
            'Unable to check' : 
            netstat.split('\n').filter(line => line.includes('LISTEN')).map(line => line.trim())
        };
      } catch (err) {
        deploymentInfo.network = { error: 'Failed to check network information' };
      }
      
      // Check database connection
      if (process.env.DATABASE_URL) {
        deploymentInfo.database = { available: true };
        // We don't actually test the connection to avoid potential side effects
      } else {
        deploymentInfo.database = { available: false };
      }
      
      res.json(deploymentInfo);
    } catch (error) {
      console.error("Error in deployment check:", error);
      res.status(500).json({ 
        message: "Error performing deployment check", 
        error: String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
