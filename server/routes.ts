import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertExcelRequirementResponseSchema,
  type ExcelRequirementResponse
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { promisify } from "util";
import { exec as cpExec } from "child_process";

// Helper function for getting the directory path in ES modules
const getDirPath = () => {
  const currentFilePath = fileURLToPath(import.meta.url);
  return dirname(currentFilePath);
};

const exec = promisify(cpExec);

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix with /api
  const apiRouter = app.route('/api');
  
  // Get all Excel requirement responses (View Requirements)
  app.get("/api/excel-requirements", async (_req: Request, res: Response) => {
    try {
      const responses = await storage.getExcelRequirementResponses();
      return res.json(responses);
    } catch (error) {
      console.error("Error fetching Excel requirement responses:", error);
      return res.status(500).json({ message: "Failed to fetch Excel requirement responses" });
    }
  });

  // Get a specific Excel requirement response (View Requirements)
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

  // Post Excel requirement responses (Upload Requirements)
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

  // Analyze Excel data (Upload Requirements)
  app.post("/api/analyze-excel", async (req: Request, res: Response) => {
    try {
      // Extract data from the uploaded Excel file
      const excelData = req.body.data;
      const replaceExisting = req.body.replaceExisting === true;
      
      if (!excelData || !Array.isArray(excelData)) {
        return res.status(400).json({ message: "Invalid Excel data format. Expected an array." });
      }
      
      // Convert Excel data to our database format
      const formattedData = excelData.map(row => {
        return {
          requirement: row.requirement || '',
          category: row.category || '',
          rfpName: row.rfpName || "",
          uploadedBy: row.uploadedBy || 'System'
        };
      });
      
      // Process the formatted data in the database
      let responses = [];
      
      if (replaceExisting) {
        // Delete all existing data if replaceExisting is true
        await storage.deleteAllExcelRequirementResponses();
        console.log("Deleted all existing Excel requirement responses");
      }
      
      // Create all the new responses
      responses = await storage.createExcelRequirementResponses(formattedData);
      console.log(`Created ${responses.length} Excel requirement responses`);
      
      return res.status(201).json({ 
        message: `Successfully processed ${responses.length} entries from Excel file`, 
        data: responses 
      });
    } catch (error) {
      console.error("Error analyzing Excel data:", error);
      return res.status(500).json({ message: "Failed to analyze Excel data", error: String(error) });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Generate response using selected LLM
  app.post('/api/generate-response', async (req: Request, res: Response) => {
    try {
      const { requirementId, model, requirement, provider, rfpName, uploadedBy } = req.body;
      
      // Log the complete request for debugging
      console.log('==== DETAILED REQUEST DEBUG - /api/generate-response ====');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Check for required parameters
      if (!requirementId) {
        return res.status(400).json({ message: 'Missing requirementId parameter' });
      }
      
      // Set default model if not provided
      const modelProvider = provider || model || 'openAI';
      
      // Get the requirement text from the database if not provided in the request
      let requirementText = requirement;
      if (!requirementText) {
        try {
          const requirementRecord = await storage.getExcelRequirementResponse(Number(requirementId));
          if (requirementRecord && requirementRecord.requirement) {
            requirementText = requirementRecord.requirement;
          }
        } catch (err) {
          console.warn(`Could not fetch requirement text for ID ${requirementId}:`, err);
        }
      }
      
      console.log(`Processing request to generate response for requirement ${requirementId} with model ${modelProvider}`);
      console.log(`Requirement text: ${requirementText?.substring(0, 100)}${requirementText?.length > 100 ? '...' : ''}`);
      
      // Simulate different response formats based on the model
      let responseContent;
      
      if (modelProvider.toLowerCase() === 'openai') {
        responseContent = {
          finalResponse: `This is a simulated OpenAI response for requirement ${requirementId}`,
          openaiResponse: `Detailed OpenAI response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
          modelProvider: 'openai'
        };
      } else if (modelProvider.toLowerCase() === 'claude' || modelProvider.toLowerCase() === 'anthropic') {
        responseContent = {
          finalResponse: `This is a simulated Anthropic response for requirement ${requirementId}`,
          anthropicResponse: `Detailed Claude response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
          modelProvider: 'anthropic'
        };
      } else if (modelProvider.toLowerCase() === 'deepseek') {
        responseContent = {
          finalResponse: `This is a simulated DeepSeek response for requirement ${requirementId}`,
          deepseekResponse: `Detailed DeepSeek response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
          modelProvider: 'deepseek'
        };
      } else if (modelProvider.toLowerCase() === 'moa') {
        responseContent = {
          finalResponse: `This is a simulated MOA (Mixture of Agents) response for requirement ${requirementId}`,
          openaiResponse: `OpenAI component of MOA response`,
          anthropicResponse: `Anthropic component of MOA response`,
          deepseekResponse: `DeepSeek component of MOA response`,
          moaResponse: `Final synthesized MOA response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
          modelProvider: 'moa'
        };
      } else {
        responseContent = {
          finalResponse: `This is a simulated response using ${modelProvider} for requirement ${requirementId}`,
          modelProvider
        };
      }
      
      // Log the response details
      console.log('==== DETAILED RESPONSE DEBUG - /api/generate-response ====');
      console.log('Response fields:');
      console.log('- generated_response:', responseContent.finalResponse ? 'Present' : 'Not present');
      console.log('- openai_response:', responseContent.openaiResponse ? 'Present' : 'Not present');
      console.log('- anthropic_response:', responseContent.anthropicResponse ? 'Present' : 'Not present');
      console.log('- deepseek_response:', responseContent.deepseekResponse ? 'Present' : 'Not present');
      
      // Return the response
      return res.status(200).json({ 
        success: true,
        message: `Response generated for requirement ${requirementId} with model ${modelProvider}`,
        requirementId,
        model: modelProvider,
        ...responseContent
      });
    } catch (error) {
      console.error('Error in generate-response:', error);
      return res.status(500).json({ message: 'Failed to generate response', error: String(error) });
    }
  });

  // API key validation check
  app.get('/api/validate-keys', async (_req: Request, res: Response) => {
    // Check if we have the necessary API keys in the environment
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY ? true : false,
      anthropic: process.env.ANTHROPIC_API_KEY ? true : false,
      deepseek: process.env.DEEPSEEK_API_KEY ? true : false
    };
    
    // Check if the database is available
    let databaseAvailable = false;
    try {
      const startTime = Date.now();
      await storage.ping();
      const endTime = Date.now();
      databaseAvailable = true;
      
      return res.json({
        apiKeys,
        database: {
          available: databaseAvailable,
          responseTime: `${endTime - startTime}ms`
        },
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error("Database connection error:", error);
      return res.json({
        apiKeys,
        database: {
          available: false,
          error: String(error)
        },
        environment: process.env.NODE_ENV || 'development'
      });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}