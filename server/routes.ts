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
import { spawn } from "child_process";
import { mapPythonResponseToDbFields } from "./field_mapping_fix";
import { validateRequirementId, validateModelName, validateBoolean } from "./pythonRunner";
import OpenAI from "openai";

// Helper function for getting the directory path in ES modules
const getDirPath = () => {
  const currentFilePath = fileURLToPath(import.meta.url);
  return dirname(currentFilePath);
};

// Get the project root directory (where Python scripts are located)
// In Docker/production, this is /app (Docker WORKDIR)
// In development, this is the project root
const getProjectRoot = () => {
  // In Docker, WORKDIR is /app and Python scripts are copied there
  // process.cwd() should be /app in production
  const cwd = process.cwd();
  
  // If we're in a built environment (dist folder), go up to project root
  if (cwd.includes('/dist/') || cwd.endsWith('/dist')) {
    return path.resolve(cwd, '..');
  }
  
  // Otherwise use current working directory (should be /app in Docker)
  return cwd;
};

// Removed unused exec import - all Python calls now use secure spawn() with argument arrays

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix with /api
  const apiRouter = app.route('/api');
  
  // Get analytics/fitment score data
  app.get("/api/analytics", async (req: Request, res: Response) => {
    try {
      let responses = await storage.getExcelRequirementResponses();
      
      // Filter by RFP name if provided
      const rfpName = req.query.rfpName as string | undefined;
      if (rfpName && rfpName !== 'all' && rfpName.trim() !== '') {
        responses = responses.filter(r => r.rfpName === rfpName);
      }
      
      // Calculate fitment score metrics
      const totalQuestions = responses.length;
      const responsesGenerated = responses.filter(r => r.finalResponse && r.finalResponse.trim() !== '').length;
      
      // Count EKG statuses - only count responses that have EKG status
      const ekgResponses = responses.filter(r => r.ekgStatus && r.ekgStatus.trim() !== '');
      const fullySupported = ekgResponses.filter(r => r.ekgStatus === 'fully_available').length;
      const partiallySupported = ekgResponses.filter(r => r.ekgStatus === 'partially_available').length;
      const notSupported = ekgResponses.filter(r => r.ekgStatus === 'not_available').length;
      
      // Calculate fitment percentage using individual fitment scores if available
      // Fall back to fixed scores (1.0, 0.5, 0.0) if fitment scores are not calculated
      const ekgResponsesGenerated = fullySupported + partiallySupported + notSupported;
      let totalScore = 0;
      let responsesWithFitmentScore = 0;
      
      // Use individual fitment scores if available
      ekgResponses.forEach(r => {
        if (r.fitmentScore !== null && r.fitmentScore !== undefined) {
          totalScore += r.fitmentScore;
          responsesWithFitmentScore++;
        } else {
          // Fallback to fixed scores based on status
          if (r.ekgStatus === 'fully_available') {
            totalScore += 1.0;
          } else if (r.ekgStatus === 'partially_available') {
            totalScore += 0.5;
          } else if (r.ekgStatus === 'not_available') {
            totalScore += 0.0;
          }
        }
      });
      
      const fitmentPercentage = ekgResponsesGenerated > 0 
        ? Math.round((totalScore / ekgResponsesGenerated) * 100 * 100) / 100  // Round to 2 decimal places
        : 0;
      
      // Get unique RFP names for filter dropdown
      const allResponses = await storage.getExcelRequirementResponses();
      const uniqueRfpNames = Array.from(new Set(
        allResponses
          .map(r => r.rfpName)
          .filter((name): name is string => !!name && name.trim() !== '')
      )).sort();
      
      return res.status(200).json({
        success: true,
        data: {
          totalQuestions,
          responsesGenerated,
          fullySupported,
          partiallySupported,
          notSupported,
          fitmentPercentage,
          ekgResponsesGenerated, // Total EKG responses for fitment calculation
          uniqueRfpNames, // Available RFP names for filtering
        }
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch analytics data",
        error: error.message 
      });
    }
  });

  // Recalculate fitment scores for all EKG responses
  app.post("/api/analytics/recalculate-fitment-scores", async (req: Request, res: Response) => {
    try {
      console.log("Starting fitment score recalculation for all EKG responses...");
      
      // Get all EKG responses (those with ekgStatus)
      const allResponses = await storage.getExcelRequirementResponses();
      const ekgResponses = allResponses.filter(r => r.ekgStatus && r.ekgStatus.trim() !== '');
      
      if (ekgResponses.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No EKG responses found to calculate fitment scores for",
          processed: 0,
          total: 0
        });
      }

      const projectRoot = getProjectRoot();
      const pythonScriptPath = path.join(projectRoot, 'calculate_fitment_score.py');
      
      let processed = 0;
      let errors = 0;
      const results: Array<{ id: number; success: boolean; score?: number; error?: string }> = [];

      // Process each EKG response
      for (const response of ekgResponses) {
        try {
          // Parse EKG data
          let ekgAvailableFeatures: any[] = [];
          let ekgGapsCustomizations: any[] = [];
          
          try {
            if (response.ekgAvailableFeatures) {
              ekgAvailableFeatures = JSON.parse(response.ekgAvailableFeatures);
            }
          } catch (e) {
            console.warn(`Failed to parse ekgAvailableFeatures for response ${response.id}:`, e);
          }
          
          try {
            if (response.ekgGapsCustomizations) {
              ekgGapsCustomizations = JSON.parse(response.ekgGapsCustomizations);
            }
          } catch (e) {
            console.warn(`Failed to parse ekgGapsCustomizations for response ${response.id}:`, e);
          }

          // Calculate fitment score
          const fitmentResult = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
            const pythonProcess = spawn('python3', [
              pythonScriptPath,
              response.ekgStatus || '',
              JSON.stringify(ekgAvailableFeatures),
              JSON.stringify(ekgGapsCustomizations),
              response.requirement || ''
            ], {
              stdio: ['pipe', 'pipe', 'pipe'],
              env: process.env,
              cwd: projectRoot
            });

            let stdout = '';
            let stderr = '';
            const timeout = setTimeout(() => {
              pythonProcess.kill('SIGTERM');
              reject(new Error('Fitment score calculation timeout'));
            }, 10000);

            pythonProcess.stdout.on('data', (data) => {
              stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
              stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
              clearTimeout(timeout);
              resolve({ stdout, stderr, code });
            });

            pythonProcess.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          if (fitmentResult.code === 0) {
            const fitmentData = JSON.parse(fitmentResult.stdout);
            if (fitmentData.success && typeof fitmentData.fitment_score === 'number') {
              const fitmentScore = fitmentData.fitment_score;
              
              // Update database
              await storage.updateExcelRequirementResponse(response.id, {
                fitmentScore
              });
              
              processed++;
              results.push({ id: response.id, success: true, score: fitmentScore });
              console.log(`Calculated fitment score for response ${response.id}: ${fitmentScore}`);
            } else {
              errors++;
              results.push({ id: response.id, success: false, error: 'Invalid response from calculation script' });
            }
          } else {
            errors++;
            results.push({ id: response.id, success: false, error: fitmentResult.stderr || 'Calculation failed' });
          }
        } catch (error: any) {
          errors++;
          console.error(`Error calculating fitment score for response ${response.id}:`, error);
          results.push({ id: response.id, success: false, error: error.message || 'Unknown error' });
        }
      }

      console.log(`Fitment score recalculation completed: ${processed} processed, ${errors} errors out of ${ekgResponses.length} total`);

      return res.status(200).json({
        success: true,
        message: `Recalculated fitment scores for ${processed} out of ${ekgResponses.length} EKG responses`,
        processed,
        errors,
        total: ekgResponses.length,
        results: results.slice(0, 10) // Return first 10 results for debugging
      });
    } catch (error: any) {
      console.error("Error recalculating fitment scores:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to recalculate fitment scores",
        error: error.message 
      });
    }
  });

  // Get available vector stores from OpenAI
  app.get("/api/vector-stores", async (req: Request, res: Response) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          success: false, 
          message: "OPENAI_API_KEY is required to fetch vector stores" 
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      console.log("Fetching vector stores from OpenAI...");
      
      // Fetch vector stores from OpenAI
      // Based on Python SDK: client.vector_stores.list()
      // In Node.js SDK, this is openai.vectorStores.list() (non-beta)
      let vectorStores;
      try {
        vectorStores = await openai.vectorStores.list();
        console.log(`Found ${vectorStores.data.length} vector stores`);
      } catch (err: any) {
        console.error("Error calling vectorStores.list():", err);
        console.error("Error details:", {
          message: err.message,
          status: err.status,
          response: err.response?.data,
        });
        throw err;
      }
      
      const stores = vectorStores.data.map((store: any) => {
        const fileCounts = store.file_counts || {};
        return {
          id: store.id,
          name: store.name || `Vector Store ${store.id.substring(0, 8)}`,
          status: store.status,
          fileCounts: {
            total: fileCounts.total || 0,
            in_progress: fileCounts.in_progress || 0,
            completed: fileCounts.completed || 0,
            failed: fileCounts.failed || 0,
            cancelled: fileCounts.cancelled || 0,
          },
          createdAt: store.created_at,
        };
      });

      console.log(`Returning ${stores.length} vector stores to client`);

      return res.status(200).json({
        success: true,
        data: stores
      });
    } catch (error: any) {
      console.error("Error fetching vector stores:", error);
      console.error("Error stack:", error.stack);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch vector stores",
        error: error.message,
        details: error.response?.data || error.toString()
      });
    }
  });

  // Get vector stores bound to an RFP
  app.get("/api/rfp-vector-stores/:rfpName", async (req: Request, res: Response) => {
    try {
      const rfpName = decodeURIComponent(req.params.rfpName);
      
      if (!rfpName || rfpName.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: "RFP name is required" 
        });
      }

      const mappings = await storage.getRfpVectorStoreMappings(rfpName);
      
      return res.status(200).json({
        success: true,
        data: mappings.map(m => ({
          id: m.vectorStoreId,
          name: m.vectorStoreName || m.vectorStoreId,
          rfpName: m.rfpName,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }))
      });
    } catch (error: any) {
      console.error("Error fetching RFP vector store mappings:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch RFP vector store mappings",
        error: error.message 
      });
    }
  });

  // Save/update vector store bindings for an RFP
  app.post("/api/rfp-vector-stores/:rfpName", async (req: Request, res: Response) => {
    try {
      const rfpName = decodeURIComponent(req.params.rfpName);
      const { vectorStores } = req.body; // Array of { id: string, name?: string }
      
      if (!rfpName || rfpName.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: "RFP name is required" 
        });
      }

      if (!Array.isArray(vectorStores)) {
        return res.status(400).json({ 
          success: false, 
          message: "vectorStores must be an array" 
        });
      }

      // Validate vector store IDs
      const validVectorStores = vectorStores.filter((vs: any) =>
        vs && typeof vs.id === 'string' && vs.id.trim() !== ''
      );

      // OpenAI Responses API file_search tool has a hard limit of 2 vector stores per request
      const MAX_VECTOR_STORES = 2;
      
      // Block saving more than the allowed limit
      if (validVectorStores.length > MAX_VECTOR_STORES) {
        return res.status(400).json({
          success: false,
          message: `Cannot bind more than ${MAX_VECTOR_STORES} vector stores. OpenAI's API has a hard limit of ${MAX_VECTOR_STORES} vector stores per file_search request. Please select only ${MAX_VECTOR_STORES} vector stores.`,
          maxAllowed: MAX_VECTOR_STORES,
          attempted: validVectorStores.length
        });
      }

      // Save mappings (replaces existing ones)
      const mappings = await storage.setRfpVectorStoreMappings(rfpName, validVectorStores);

      return res.status(200).json({
        success: true,
        message: validVectorStores.length === 0
          ? "Warning: No vector stores selected. Bindings cleared."
          : `Successfully bound ${validVectorStores.length} vector store(s) to RFP "${rfpName}"`,
        data: mappings.map(m => ({
          id: m.vectorStoreId,
          name: m.vectorStoreName || m.vectorStoreId,
          rfpName: m.rfpName,
        })),
        warning: validVectorStores.length === 0 ? "No vector stores were selected. EKG generation will be blocked for this RFP." : undefined
      });
    } catch (error: any) {
      console.error("Error saving RFP vector store mappings:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to save RFP vector store mappings",
        error: error.message 
      });
    }
  });

  // Get all Excel requirement responses (View Requirements)
  app.get("/api/excel-requirements", async (_req: Request, res: Response) => {
    try {
      console.log("[GET /api/excel-requirements] Fetching Excel requirement responses...");
      const responses = await storage.getExcelRequirementResponses();
      console.log(`[GET /api/excel-requirements] Successfully fetched ${responses.length} responses`);
      return res.json(responses);
    } catch (error: any) {
      console.error("[GET /api/excel-requirements] Error fetching Excel requirement responses:", error);
      console.error("[GET /api/excel-requirements] Error stack:", error?.stack);
      console.error("[GET /api/excel-requirements] Error message:", error?.message);
      return res.status(500).json({ 
        message: "Failed to fetch Excel requirement responses",
        error: error?.message || String(error)
      });
    }
  });

  // Delete multiple Excel requirement responses (bulk delete)
  // IMPORTANT: This route must be registered BEFORE /api/excel-requirements/:id
  // to prevent Express from matching "bulk-delete" as an ID parameter
  app.post("/api/excel-requirements/bulk-delete", async (req: Request, res: Response) => {
    console.log("[POST /api/excel-requirements/bulk-delete] Request received");
    console.log("[BULK-DELETE] Request body:", req.body);
    
    try {
      const { ids } = req.body;
      
      console.log("[BULK-DELETE] Parsed IDs:", ids);
      
      if (!Array.isArray(ids) || ids.length === 0) {
        console.log("[BULK-DELETE] Validation failed: Invalid or empty IDs array");
        return res.status(400).json({ message: "Invalid request. Expected an array of IDs." });
      }

      // Validate all IDs are numbers
      const validIds = ids.filter(id => typeof id === 'number' && !isNaN(id));
      console.log("[BULK-DELETE] Valid IDs:", validIds);
      
      if (validIds.length === 0) {
        console.log("[BULK-DELETE] Validation failed: No valid numeric IDs");
        return res.status(400).json({ message: "Invalid IDs. All IDs must be valid numbers." });
      }

      // Delete the requirements (references will be cascade deleted)
      console.log("[BULK-DELETE] Calling storage.deleteExcelRequirementResponses with IDs:", validIds);
      const deletedCount = await storage.deleteExcelRequirementResponses(validIds);
      console.log("[BULK-DELETE] Deleted count:", deletedCount);
      
      return res.json({ 
        message: `Successfully deleted ${deletedCount} requirement(s)`,
        deletedCount 
      });
    } catch (error) {
      console.error("[BULK-DELETE] Error deleting Excel requirement responses:", error);
      console.error("[BULK-DELETE] Error stack:", error instanceof Error ? error.stack : 'No stack');
      return res.status(500).json({ 
        message: "Failed to delete Excel requirement responses",
        error: error instanceof Error ? error.message : String(error)
      });
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
      // RELIABILITY: Add input validation and size limits
      const excelData = req.body.data;
      const replaceExisting = req.body.replaceExisting === true;
      
      // Validate input structure
      if (!excelData || !Array.isArray(excelData)) {
        return res.status(400).json({ message: "Invalid Excel data format. Expected an array." });
      }
      
      // SECURITY: Add size limits to prevent memory exhaustion
      const MAX_REQUIREMENTS = 10000; // Reasonable limit
      if (excelData.length > MAX_REQUIREMENTS) {
        return res.status(400).json({ 
          message: `Too many requirements. Maximum allowed: ${MAX_REQUIREMENTS}, received: ${excelData.length}` 
        });
      }
      
      // Validate each requirement has required fields
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        if (!row || typeof row !== 'object') {
          return res.status(400).json({ message: `Invalid requirement at index ${i}: must be an object` });
        }
        if (!row.requirement || typeof row.requirement !== 'string' || row.requirement.trim().length === 0) {
          return res.status(400).json({ message: `Invalid requirement at index ${i}: requirement field is required` });
        }
        if (row.requirement.length > 10000) {
          return res.status(400).json({ message: `Requirement at index ${i} exceeds maximum length of 10000 characters` });
        }
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
      
      // Automatically generate embeddings for the new requirements in the background
      const requirementIds = responses.map(r => r.id);
      if (requirementIds.length > 0) {
        console.log(`Triggering automatic embedding generation for ${requirementIds.length} requirements...`);
        
        // Run embedding generation in background (don't wait for it)
        const { spawn } = await import('child_process');
        const projectRoot = getProjectRoot();
        const pythonScriptPath = path.join(projectRoot, 'generate_embeddings.py');
        console.log(`Generating embeddings - Python script: ${pythonScriptPath}, CWD: ${projectRoot}`);
        const embeddingProcess = spawn('python3', [pythonScriptPath, requirementIds.join(',')], {
          cwd: projectRoot,
          env: process.env
        });
        
        embeddingProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✓ Successfully generated embeddings for ${requirementIds.length} requirements`);
          } else {
            console.error(`✗ Embedding generation failed with code ${code}`);
          }
        });
        
        embeddingProcess.on('error', (error) => {
          console.error('Error in background embedding generation:', error);
        });
      }
      
      return res.status(201).json({ 
        message: `Successfully processed ${responses.length} entries from Excel file`, 
        data: responses 
      });
    } catch (error) {
      console.error("Error analyzing Excel data:", error);
      return res.status(500).json({ message: "Failed to analyze Excel data", error: String(error) });
    }
  });

  // DEPRECATED: Generate embeddings for requirements
  // WARNING: This endpoint should ONLY be used for adding REFERENCE DATA to the embeddings table
  // DO NOT use this for uploaded user requirements - those use on-the-fly embedding generation
  // The embeddings table should contain only the 9,650 pristine reference embeddings
  app.post("/api/generate-embeddings", async (req: Request, res: Response) => {
    try {
      const { requirementIds } = req.body;
      
      // Validate and sanitize input
      let validatedIds: string | null = null;
      if (requirementIds) {
        if (!Array.isArray(requirementIds)) {
          return res.status(400).json({ message: 'requirementIds must be an array' });
        }
        
        // Validate that all IDs are numbers
        const numericIds = requirementIds.filter(id => {
          const num = parseInt(id);
          return !isNaN(num) && num > 0;
        });
        
        if (numericIds.length === 0) {
          return res.status(400).json({ message: 'No valid requirement IDs provided' });
        }
        
        validatedIds = numericIds.join(',');
      }
      
      console.log(`Generating embeddings${validatedIds ? ` for specific requirements: ${validatedIds}` : ' for all requirements without embeddings'}`);
      
      // Use spawn instead of exec for security - prevents command injection
      const { spawn } = await import('child_process');
      const args = validatedIds ? [validatedIds] : [];
      
      const projectRoot = getProjectRoot();
      const pythonScriptPath = path.join(projectRoot, 'generate_embeddings.py');
      console.log(`Generating embeddings - Python script: ${pythonScriptPath}, CWD: ${projectRoot}`);
      const pythonProcess = spawn('python3', [pythonScriptPath, ...args], {
        cwd: projectRoot,
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.error('Python stderr:', data.toString());
      });
      
      // Wait for the process to complete
      await new Promise<void>((resolve, reject) => {
        // Set timeout
        const timeout = setTimeout(() => {
          pythonProcess.kill();
          reject(new Error('Embedding generation timed out after 5 minutes'));
        }, 300000); // 5 minute timeout
        
        pythonProcess.on('close', (code: number | null) => {
          clearTimeout(timeout);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Python process exited with code ${code}`));
          }
        });
        
        pythonProcess.on('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      console.log('Python embedding generation output:', stdout);
      
      // Parse the response - extract the JSON part
      try {
        // Try to parse the entire stdout as JSON first
        let data;
        try {
          data = JSON.parse(stdout.trim());
        } catch (e) {
          // If that fails, extract the JSON block (everything from first { to last })
          const firstBrace = stdout.indexOf('{');
          const lastBrace = stdout.lastIndexOf('}');
          
          if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('No JSON output found in response');
          }
          
          const jsonStr = stdout.substring(firstBrace, lastBrace + 1);
          data = JSON.parse(jsonStr);
        }
        
        if (data.success) {
          return res.status(200).json({
            success: true,
            message: 'Embeddings generated successfully',
            statistics: data.statistics
          });
        } else {
          return res.status(500).json({
            success: false,
            message: 'Embedding generation failed',
            errors: data.statistics?.errors || []
          });
        }
      } catch (parseError) {
        console.error('Failed to parse embedding generation output:', parseError);
        return res.status(500).json({
          success: false,
          message: 'Failed to parse embedding generation output',
          rawOutput: stdout,
          stderr: stderr
        });
      }
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return res.status(500).json({ 
        message: 'Failed to generate embeddings',
        error: String(error)
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Generate response using selected LLM
  app.post('/api/generate-response', async (req: Request, res: Response) => {
    try {
      const { 
        requirementId, 
        model, 
        requirement, 
        provider, 
        uploadedBy,
        skipSimilaritySearch = false // New flag to skip similarity search
      } = req.body;
      
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
      // Priority: elaboratedRequirement > requirement from request > requirement from DB
      let requirementText = requirement;
      let usingElaboratedQuestion = false;
      let requirementRecord: any = null;
      
      try {
        // CRITICAL: Fetch the requirement record using the exact requirementId from the request
        const fetchedRequirementId = Number(requirementId);
        console.log(`[RFP_IDENTIFICATION] Fetching requirement record for ID: ${fetchedRequirementId} (type: ${typeof fetchedRequirementId})`);
        
        requirementRecord = await storage.getExcelRequirementResponse(fetchedRequirementId);
        
        if (requirementRecord) {
          console.log(`[RFP_IDENTIFICATION] Found requirement record:`, {
            id: requirementRecord.id,
            rfpName: requirementRecord.rfpName,
            requirementPreview: requirementRecord.requirement?.substring(0, 50)
          });
          
          // Check if elaborated requirement exists and use it if available
          if (requirementRecord.elaboratedRequirement && requirementRecord.elaboratedRequirement.trim()) {
            requirementText = requirementRecord.elaboratedRequirement;
            usingElaboratedQuestion = true;
            console.log(`Using elaborated question for requirement ${requirementId}`);
          } else if (!requirementText && requirementRecord.requirement) {
            requirementText = requirementRecord.requirement;
          }
        } else {
          console.error(`[RFP_IDENTIFICATION] Requirement record NOT FOUND for ID: ${fetchedRequirementId}`);
        }
      } catch (err) {
        console.error(`[RFP_IDENTIFICATION] Error fetching requirement record for ID ${requirementId}:`, err);
        console.warn(`Could not fetch requirement text for ID ${requirementId}:`, err);
      }
      
      // Get RFP name from the requirement record (reuse the one already fetched)
      // CRITICAL: This must be the RFP name from THIS specific requirement record
      const rfpName = requirementRecord?.rfpName || null;
      
      console.log(`[RFP_IDENTIFICATION] Processing requirement ${requirementId} with model ${modelProvider}`);
      console.log(`[RFP_IDENTIFICATION] Requirement record ID: ${requirementRecord?.id || 'not found'}`);
      console.log(`[RFP_IDENTIFICATION] RFP Name from record: "${rfpName || 'NULL'}"`);
      console.log(`[RFP_IDENTIFICATION] Full requirement record rfpName field:`, requirementRecord?.rfpName);
      console.log(`Using ${usingElaboratedQuestion ? 'ELABORATED' : 'ORIGINAL'} question`);
      console.log(`Requirement text: ${requirementText?.substring(0, 100)}${requirementText?.length > 100 ? '...' : ''}`);
      
      try {
        const normalizedModelProvider = modelProvider.toLowerCase();

        // Direct OpenAI EKG flow (bypasses Python)
        if (normalizedModelProvider === 'ekg') {
          if (!process.env.OPENAI_API_KEY) {
            return res.status(400).json({ success: false, message: "Missing OPENAI_API_KEY" });
          }
          if (!requirementText) {
            return res.status(400).json({ success: false, message: "Requirement text is required for EKG generation" });
          }

          // Check for bound vector stores using the RFP name from the requirement
          // VALIDATION: Each requirement must use its own RFP's vector stores
          // NO FALLBACKS - Must have valid RFP name and bound vector stores
          
          // First, validate that we have an RFP name
          if (!rfpName || rfpName.trim() === '') {
            console.error(`[VALIDATION] Requirement ${requirementId}: BLOCKED - No RFP name found in requirement record.`);
            console.error(`[VALIDATION] Requirement ${requirementId}: Requirement record:`, requirementRecord ? { id: requirementRecord.id, rfpName: requirementRecord.rfpName } : 'null');
            return res.status(400).json({ 
              success: false, 
              message: `Requirement ${requirementId} does not have an RFP name assigned. Cannot generate EKG response without RFP-specific vector store bindings.`
            });
          }
          
          // Fetch vector store bindings for this specific RFP
          console.log(`[VALIDATION] Requirement ${requirementId}: Checking vector store bindings for RFP: "${rfpName}"`);
          let boundVectorStores: string[] = [];
          let boundVectorStoreNames: string[] = [];
          
          try {
            const mappings = await storage.getRfpVectorStoreMappings(rfpName);
            boundVectorStores = mappings.map(m => m.vectorStoreId);
            boundVectorStoreNames = mappings.map(m => m.vectorStoreName || m.vectorStoreId);
            console.log(`[VALIDATION] Requirement ${requirementId}: Found ${boundVectorStores.length} bound vector store(s) for RFP "${rfpName}": [${boundVectorStoreNames.join(', ')}]`);
            console.log(`[VALIDATION] Requirement ${requirementId}: Vector store IDs: [${boundVectorStores.join(', ')}]`);
          } catch (err) {
            console.error(`[VALIDATION] Requirement ${requirementId}: ERROR fetching vector store mappings for RFP "${rfpName}":`, err);
            return res.status(400).json({ 
              success: false, 
              message: `Failed to fetch vector store bindings for RFP "${rfpName}". Please check the 'Bind EKG' page.`
            });
          }

          // If no vector stores are bound, block generation (NO FALLBACK)
          if (boundVectorStores.length === 0) {
            console.error(`[VALIDATION] Requirement ${requirementId}: BLOCKED - No vector stores bound for RFP "${rfpName}"`);
            return res.status(400).json({ 
              success: false, 
              message: `No vector stores are bound for RFP "${rfpName}". Please bind vector stores in the 'Bind EKG' page before generating responses.`
            });
          }

          // OpenAI Responses API file_search tool has a hard limit of 2 vector stores per request
          const MAX_VECTOR_STORES = 2;
          
          if (boundVectorStores.length > MAX_VECTOR_STORES) {
            console.warn(`[EKG_WARNING] RFP "${rfpName}" has ${boundVectorStores.length} vector stores bound, but OpenAI only allows ${MAX_VECTOR_STORES}. Please update bindings.`);
            return res.status(400).json({
              success: false,
              message: `This RFP has ${boundVectorStores.length} vector stores bound, but OpenAI's API only allows a maximum of ${MAX_VECTOR_STORES} per request. Please go to 'Bind EKG' and reduce the number of bound vector stores to ${MAX_VECTOR_STORES} or fewer.`,
              vectorStoreCount: boundVectorStores.length,
              maxAllowed: MAX_VECTOR_STORES
            });
          }
          
          const vectorStoreIds = boundVectorStores;
          const vectorStoreNamesFromBindings = boundVectorStoreNames.length > 0
            ? boundVectorStoreNames
            : boundVectorStores; // Use IDs as names if names not available (display only, not a fallback for selection)

          console.log(`Using ${vectorStoreIds.length} bound vector store(s) for RFP "${rfpName}":`, vectorStoreIds);

          // Build vector store description for prompt
          const vectorStoreDescriptions = vectorStoreIds.map((id, index) => 
            `${index + 1}. Vector Store ${index + 1}: ${id}`
          ).join('\n');

          const input = `
You are a Senior Wealth Management Pre-Sales Consultant preparing formal RFP responses for a leading financial software platform (Intellect Wealth). Your response will be sent directly to a customer, so it must be professional, concise, confident, and customer-friendly.

The customer requirement is:

${requirementText}

You have access to the following vector store(s):
${vectorStoreDescriptions}

------------------------------------------------------------
CRITICAL INSTRUCTIONS FOR FILE_SEARCH USAGE
------------------------------------------------------------
- You must perform exactly ONE file_search tool call.
- This single search must query all vector stores together.
- Use one consolidated query built from exact key phrases in the requirement text.
- Do NOT paraphrase, expand, add synonyms, or generate multiple query variations.
- Retrieve up to 20 of the most relevant results.
- Do not mention tools, file_search, vector stores, or retrieval mechanisms in your final JSON.

------------------------------------------------------------
STEP 1 – BREAK REQUIREMENT INTO SUBREQUIREMENTS
------------------------------------------------------------
From the customer requirement text:

1. Derive up to 10 clear, non-overlapping subrequirements.
   - Each subrequirement should describe one specific capability, outcome, or functional aspect.
   - Use concise wording closely aligned with the customer’s language.
2. Assign each subrequirement:
   - A unique ID: "SR1", "SR2", ..., in order.
   - A short title (5–10 words).
   - A brief description (1–2 sentences).
3. Assign each subrequirement a weight (integer) so that:
   - All weights are >= 0.
   - The sum of all weights is exactly 100.
   - Weights reflect business criticality within the wealth management journey:
     - Higher weights for onboarding, KYC, suitability, portfolio & order management, risk, reporting, integration, performance, billing, digital channels.
     - Lower weights for usability enhancements, non-core preferences, or minor options.
4. For each subrequirement, set:
   - integration_related: true if it involves integration, APIs, interfacing, external systems, data exchange.
   - reporting_related: true if it involves reports, dashboards, statements, MIS, analytics.
   - Otherwise set these flags to false.

Use the file_search results to assess fitment later, not to define the subrequirements themselves.

------------------------------------------------------------
STEP 2 – POST-SEARCH CAPABILITY ASSESSMENT
------------------------------------------------------------

Base all capability assessments strictly on retrieved content. If no retrieved content is meaningfully related to a subrequirement, treat that subrequirement as not_available.

For EACH subrequirement (SR1, SR2, ...), determine:

1) Subrequirement Status
- fully_available
- partially_available
- not_available

2) Subrequirement Fitment Percentage (0–100)
- Reflects how well the platform supports this subrequirement.
- Use this guidance:
  - If status = fully_available → fitment_percentage between 90 and 100.
  - If status = partially_available → fitment_percentage between 30 and 89.
  - If status = not_available → fitment_percentage = 0.
- Do NOT explain the scoring formula in the output.

3) Customisation Attributes
- customization_required:
  - true if the subrequirement is only partially met or relies on customisation / integration.
  - false if it is fully met with standard capabilities.
- customization_notes:
  - Short phrases describing the nature of customisation or integration, e.g.:
    - "Requires configuration of existing module"
    - "Requires minor workflow customisation"
    - "Can be implemented via integration with core banking system"
  - If customization_required = false, use an empty string "".

4) References
- references: list of document IDs or filenames from the search that you used to assess this subrequirement.

------------------------------------------------------------
STEP 3 – OVERALL STATUS AND WEIGHTED FITMENT
------------------------------------------------------------

1) Overall Fitment Percentage (0–100)
Compute the overall_fitment_percentage as the weighted average:

- overall_fitment_percentage = SUM over all subrequirements of:
  (subrequirement_fitment_percentage * subrequirement_weight) / 100

Round to the nearest integer.

2) Overall Status
Set the overall status using subrequirement statuses:
- If ALL subrequirements are fully_available → overall status = fully_available.
- If ALL subrequirements are not_available → overall status = not_available.
- Otherwise, if at least one subrequirement is fully_available or partially_available → overall status = partially_available.

3) Aggregated Features and Gaps
- available_features:
  - Short bullet-like phrases summarizing key capabilities that are clearly supported across subrequirements.
- gaps_or_customizations:
  - Short bullet-like phrases summarizing areas that require configuration, customisation, or integration.

4) Global References
- references:
  - List of unique document IDs or filenames used across all subrequirements.

------------------------------------------------------------
STEP 4 – CUSTOMER-FACING NARRATIVE ("Customer Response")
------------------------------------------------------------

You must produce a customer-facing narrative under the key "Customer Response". This will be sent as-is to the customer.

Rules:
- Maximum length: 200 words.
- Tone: professional, confident, positive, and customer-friendly.
- Use active voice and present tense: supports, enables, provides, includes.
- Focus on what the platform CAN do.
- Do NOT mention tools, file_search, vector stores, or internal logic.

If overall status = fully_available:
- Emphasize that the platform comprehensively supports the requirement.
- Reference key capabilities and how they address the business need end-to-end.

If overall status = partially_available:
- Clearly state what is supported today.
- Indicate that remaining aspects can be addressed via configuration, minor customisation, or integration.
- Use allowed gap phrasing (see language rules below).

If overall status = not_available:
- "Customer Response" MUST be exactly:
  - "Feature not available."

------------------------------------------------------------
STEP 5 – INTELLECT-SPECIFIC ADDITIONS (WHEN RELEVANT)
------------------------------------------------------------

If any subrequirement has integration_related = true:
- Ensure "Customer Response" and/or relevant customization_notes mention:
  - "Integration can be achieved using Intellect’s proprietary iTurmeric platform, which provides low-code APIs, adapters and orchestration for external systems."
- You may also refer to iTurmeric in customization_notes for integration-related subrequirements.

If any subrequirement has reporting_related = true:
- Ensure "Customer Response" and/or relevant customization_notes mention:
  - "Reports can be developed using Intellect’s proprietary CTSigma reporting suite, offering dashboards, scheduled reports and configurable drill-down analytics."
- You may also refer to CTSigma in customization_notes for reporting-related subrequirements.

You may always use these standard iTurmeric / CTSigma descriptions even if they are not explicitly found in the retrieved documents. Do not invent other specific third-party integrations beyond what is supported by retrieved content.

------------------------------------------------------------
LANGUAGE RULES (STRICT)
------------------------------------------------------------
- Use confident, professional language suitable for formal RFPs.
- Active voice and present tense: supports, enables, provides, includes.
- Avoid negative or hedging terms: "not evidenced", "not explicitly", "appears to", "seems to", "may not", "lacks", "missing", "unavailable".
- For gaps or limitations, only use:
  - "may require minor customisation"
  - "may require configuration"
  - "can be extended through integration with [system name if identified]"
- Do not reference AI, models, prompts, tools, or internal reasoning.

------------------------------------------------------------
STRICT OUTPUT FORMAT (JSON ONLY)
------------------------------------------------------------

Return ONLY a single JSON object in this format:

{
  "status": "fully_available | partially_available | not_available",
  "overall_fitment_percentage": 0-100,
  "Customer Response": "Customer-facing narrative (≤200 words). If status = 'not_available', must be exactly 'Feature not available.'",
  "subrequirements": [
    {
      "id": "SR1",
      "title": "Short title for the subrequirement",
      "description": "Brief description of this subrequirement",
      "weight": 0-100,
      "status": "fully_available | partially_available | not_available",
      "fitment_percentage": 0-100,
      "integration_related": true | false,
      "reporting_related": true | false,
      "customization_required": true | false,
      "customization_notes": "Short phrase; empty string if no customization is required",
      "references": ["document IDs or filenames used for this subrequirement"]
    }
    // ... up to 10 subrequirements total
  ],
  "available_features": [
    "Short phrases summarizing key supported capabilities"
  ],
  "gaps_or_customizations": [
    "Short phrases summarizing key gaps or customisation/integration needs"
  ],
  "references": [
    "Document IDs or filenames used across all subrequirements"
  ]
}

Additional Rules:
- JSON only. No extra commentary or text outside the JSON object.
- "Customer Response" must not exceed 200 words.
- All subrequirements’ weights must sum to exactly 100.
- Use retrieved file_search content to assess capability and fitment; do not invent unsupported features.
- If a subrequirement has no clear supporting evidence in retrieved content, treat it as not_available with fitment_percentage = 0.
`;

          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          let aiResponse;
          
          // Try models in order: gpt-5.1, then gpt-4o
          const modelsToTry = ["gpt-5.1", "gpt-4o"];
          let lastError: any = null;
          
          for (const modelName of modelsToTry) {
            try {
              console.log(`Attempting EKG generation with model: ${modelName}`);
              console.log(`[VECTOR_STORES] Total vector stores to use: ${vectorStoreIds.length}`);
              console.log(`[VECTOR_STORES] Vector store IDs:`, JSON.stringify(vectorStoreIds, null, 2));
              console.log(`[VECTOR_STORES] Vector store names:`, JSON.stringify(vectorStoreNamesFromBindings, null, 2));
              
              aiResponse = await client.responses.create({
                model: modelName,
                input,
                tools: [
                  {
                    type: "file_search",
                    vector_store_ids: vectorStoreIds  // Pass ALL bound vector stores
                  }
                ],
                tool_choice: "auto"
              });
              console.log(`EKG API call successful with model ${modelName}, response received`);
              break; // Success, exit loop
            } catch (err: any) {
              console.error(`EKG OpenAI call failed with model ${modelName}:`, err);
              console.error(`[EKG_ERROR] Full error object:`, JSON.stringify(err, null, 2));
              console.error(`[EKG_ERROR] Error message:`, err?.message);
              console.error(`[EKG_ERROR] Error status:`, err?.status);
              console.error(`[EKG_ERROR] Error response data:`, err?.response?.data);
              console.error(`[EKG_ERROR] Error response error:`, err?.response?.data?.error);
              console.error(`[EKG_ERROR] Vector stores attempted:`, vectorStoreIds);
              console.error(`[EKG_ERROR] Vector store count:`, vectorStoreIds.length);
              
              lastError = err;
              // If this is the last model, we'll return the error
              if (modelName === modelsToTry[modelsToTry.length - 1]) {
                console.error("All models failed. Error details:", {
                  message: err?.message,
                  status: err?.status,
                  response: err?.response?.data,
                  error: err?.response?.data?.error,
                  stack: err?.stack
                });
                
                // Extract detailed error message
                let errMsg = "OpenAI EKG call failed";
                if (err?.response?.data?.error?.message) {
                  errMsg = err.response.data.error.message;
                } else if (err?.message) {
                  errMsg = err.message;
                } else if (err?.response?.data?.error) {
                  errMsg = JSON.stringify(err.response.data.error);
                } else if (err?.toString) {
                  errMsg = err.toString();
                }
                
                // Add vector store context to error message
                errMsg += ` (Attempted with ${vectorStoreIds.length} vector store(s): ${vectorStoreIds.join(', ')})`;
                
                return res.status(500).json({ 
                  success: false, 
                  message: errMsg, 
                  error: err?.message,
                  vectorStoreCount: vectorStoreIds.length,
                  vectorStoreIds: vectorStoreIds
                });
              }
              // Otherwise, try next model
              console.log(`Trying next model...`);
            }
          }
          
          if (!aiResponse) {
            const errMsg = lastError?.response?.data?.error?.message || lastError?.message || "OpenAI EKG call failed with all models";
            return res.status(500).json({ success: false, message: errMsg, error: lastError?.message });
          }

          const extractResponseText = (resp: any): string => {
            if (resp?.output_text) return resp.output_text;
            if (Array.isArray(resp?.output)) {
              const parts = resp.output.flatMap((o: any) => {
                if (Array.isArray(o?.content)) {
                  return o.content.map((c: any) => c?.text || c?.content || "");
                }
                return [o?.content || o?.text || ""];
              });
              return parts.filter(Boolean).join("\n");
            }
            return "";
          };

          const rawText = extractResponseText(aiResponse);

          const jsonText = (() => {
            if (!rawText) return "";
            const start = rawText.indexOf("{");
            const end = rawText.lastIndexOf("}");
            if (start >= 0 && end > start) return rawText.substring(start, end + 1);
            return rawText.trim();
          })();

          let parsed: any = null;
          try {
            parsed = JSON.parse(jsonText);
          } catch (err) {
            console.error("Failed to parse EKG JSON:", rawText);
            return res.status(500).json({ success: false, message: "Failed to parse EKG JSON" });
          }

          const ekgStatus = parsed.status || null;
          const ekgAvailableFeatures = Array.isArray(parsed.available_features) ? parsed.available_features : [];
          const ekgGapsCustomizations = Array.isArray(parsed.gaps_or_customizations) ? parsed.gaps_or_customizations : [];
          const references = Array.isArray(parsed.references) ? parsed.references : [];
          const subrequirements = Array.isArray(parsed.subrequirements) ? parsed.subrequirements : [];
          const overallFitmentPercentage = typeof parsed.overall_fitment_percentage === 'number' 
            ? parsed.overall_fitment_percentage 
            : null;
          const customerResponse = parsed["Customer Response"] || parsed.customer_response || parsed.response || parsed.finalResponse || '';

          // Calculate fitment score based on provided percentage or available features vs gaps
          let fitmentScore: number | null = null;
          if (overallFitmentPercentage !== null && !Number.isNaN(overallFitmentPercentage)) {
            fitmentScore = Math.max(0, Math.min(1, overallFitmentPercentage / 100));
          } else {
            try {
              const projectRoot = getProjectRoot();
              const pythonScriptPath = path.join(projectRoot, 'calculate_fitment_score.py');
              
              const fitmentResult = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
                const pythonProcess = spawn('python3', [
                  pythonScriptPath,
                  ekgStatus || '',
                  JSON.stringify(ekgAvailableFeatures),
                  JSON.stringify(ekgGapsCustomizations),
                  requirementText || ''
                ], {
                  stdio: ['pipe', 'pipe', 'pipe'],
                  env: process.env,
                  cwd: projectRoot
                });

                let stdout = '';
                let stderr = '';
                const timeout = setTimeout(() => {
                  pythonProcess.kill('SIGTERM');
                  reject(new Error('Fitment score calculation timeout'));
                }, 10000);

                pythonProcess.stdout.on('data', (data) => {
                  stdout += data.toString();
                });

                pythonProcess.stderr.on('data', (data) => {
                  stderr += data.toString();
                });

                pythonProcess.on('close', (code) => {
                  clearTimeout(timeout);
                  resolve({ stdout, stderr, code });
                });

                pythonProcess.on('error', (error) => {
                  clearTimeout(timeout);
                  reject(error);
                });
              });

              if (fitmentResult.code === 0) {
                const fitmentData = JSON.parse(fitmentResult.stdout);
                if (fitmentData.success && typeof fitmentData.fitment_score === 'number') {
                  fitmentScore = fitmentData.fitment_score;
                  console.log(`Calculated fitment score for requirement ${requirementId}: ${fitmentScore}`);
                }
              } else {
                console.warn(`Fitment score calculation failed: ${fitmentResult.stderr}`);
              }
            } catch (error) {
              console.error(`Error calculating fitment score: ${error}`);
              // Continue without fitment score if calculation fails
            }
          }

          // Store vector store IDs used for this response
          const vectorStoreIdsJson = vectorStoreIds.length > 0 ? JSON.stringify(vectorStoreIds) : null;

          const updateData: any = {
            finalResponse: customerResponse,
            modelProvider: 'ekg',
            ekgStatus,
            ekgAvailableFeatures: JSON.stringify(ekgAvailableFeatures),
            ekgGapsCustomizations: JSON.stringify(ekgGapsCustomizations),
            fitmentScore,
            vectorStoreIds: vectorStoreIdsJson,
            vectorStoreNames: JSON.stringify(vectorStoreNamesFromBindings),
            ekgOverallFitmentPercentage: overallFitmentPercentage,
            ekgSubrequirements: JSON.stringify(subrequirements),
            ekgReferences: JSON.stringify(references),
            ekgRawResponse: JSON.stringify(parsed),
            ekgCustomerResponse: customerResponse,
            // Preserve any previously marked availability; do not override here
          };
          
          console.log(`Storing vector store IDs for requirement ${requirementId}:`, vectorStoreIds);

          // Persist references into similarQuestions for existing reference viewer
          if (references.length > 0) {
            updateData.similarQuestions = JSON.stringify(
              references.map((ref: any, idx: number) => ({
                id: idx + 1,
                reference: String(ref),
                category: 'EKG',
                requirement: requirementText || '',
                response: customerResponse,
                similarity_score: 1
              }))
            );
          }

          await storage.updateExcelRequirementResponse(Number(requirementId), updateData);

          return res.status(200).json({
            success: true,
            requirementId,
            model: 'ekg',
            modelProvider: 'ekg',
            vectorStoreIds,
            vectorStoreNames: vectorStoreNamesFromBindings,
            finalResponse: customerResponse,
            ekgStatus,
            ekgAvailableFeatures,
            ekgGapsCustomizations,
            references,
            ekgOverallFitmentPercentage: overallFitmentPercentage,
            ekgSubrequirements: subrequirements,
            ekgCustomerResponse: customerResponse
          });
        }

        // Call the Python FastAPI endpoint to generate the response
        // The path is a proxy to the Python FastAPI server
        console.log(`Calling Python API to generate response for requirement ${requirementId}`);
        
        // SECURITY: Validate and sanitize inputs to prevent shell injection
        const validatedRequirementId = validateRequirementId(requirementId);
        const validatedModel = validateModelName(modelProvider);
        const validatedSkipSimilarity = validateBoolean(skipSimilaritySearch);
        
        // Format the model name correctly for the Python API
        let pythonModel = validatedModel;
        if (pythonModel === 'openai') pythonModel = 'openAI';
        
        // SECURITY: Use spawn() with argument array instead of exec() with shell string
        const projectRoot = getProjectRoot();
        const pythonScriptPath = path.join(projectRoot, 'call_llm_wrapper.py');
        
        console.log(`Python script path: ${pythonScriptPath}`);
        console.log(`Working directory: ${projectRoot}`);
        
        const pythonApiResponse = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
          const pythonProcess = spawn('python3', [
            pythonScriptPath,
            validatedRequirementId.toString(),
            pythonModel,
            validatedSkipSimilarity.toString()
          ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env,
            cwd: projectRoot
          });

          let stdout = '';
          let stderr = '';
          const timeout = setTimeout(() => {
            pythonProcess.kill('SIGTERM');
            reject(new Error('Python script timeout after 60 seconds'));
          }, 60000);

          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
              console.error(`Python script exited with code ${code}`);
              console.error(`Python stderr: ${stderr}`);
              console.error(`Python stdout: ${stdout}`);
            }
            resolve({ stdout, stderr, code });
          });

          pythonProcess.on('error', (error) => {
            clearTimeout(timeout);
            console.error(`==== PYTHON PROCESS ERROR ====`);
            console.error(`Error message: ${error.message}`);
            console.error(`Error stack: ${error.stack}`);
            console.error(`Python script path: ${pythonScriptPath}`);
            console.error(`Working directory: ${projectRoot}`);
            console.error(`Python executable: python3`);
            console.error(`Environment vars present: ${Object.keys(process.env).filter(k => k.includes('API') || k.includes('DATABASE')).join(', ')}`);
            reject(error);
          });
        });
        
        // Log Python script execution result with full details
        console.log(`==== PYTHON SCRIPT EXECUTION RESULT ====`);
        console.log(`Exit code: ${pythonApiResponse.code}`);
        console.log(`Python script path: ${pythonScriptPath}`);
        console.log(`Working directory: ${projectRoot}`);
        console.log(`Command: python3 ${pythonScriptPath} ${validatedRequirementId} ${pythonModel} ${validatedSkipSimilarity}`);
        
        if (pythonApiResponse.stderr) {
          console.error(`==== PYTHON STDERR (FULL OUTPUT) ====`);
          console.error(pythonApiResponse.stderr);
        }
        
        if (pythonApiResponse.stdout) {
          console.log(`==== PYTHON STDOUT (FULL OUTPUT) ====`);
          console.log(pythonApiResponse.stdout);
        } else {
          console.log(`==== PYTHON STDOUT: EMPTY ====`);
        }
        
        // Check if Python script failed
        if (pythonApiResponse.code !== 0) {
          const errorMsg = pythonApiResponse.stderr || pythonApiResponse.stdout || 'Unknown Python script error';
          console.error(`==== PYTHON SCRIPT FAILED ====`);
          console.error(`Exit code: ${pythonApiResponse.code}`);
          console.error(`Error message: ${errorMsg}`);
          
          // Try to parse JSON error from stdout if available
          let parsedError = errorMsg;
          try {
            const jsonMatch = pythonApiResponse.stdout.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const errorJson = JSON.parse(jsonMatch[0]);
              if (errorJson.error) {
                parsedError = errorJson.error;
                if (errorJson.traceback) {
                  console.error(`Python traceback:\n${errorJson.traceback}`);
                }
              }
            }
          } catch (e) {
            // If JSON parsing fails, use original error message
          }
          
          throw new Error(`Python script failed (exit code ${pythonApiResponse.code}): ${parsedError.substring(0, 500)}`);
        }
        
        let responseData;
        
        try {
          // Extract just the JSON part from the output if it contains additional text
          const jsonStartIndex = pythonApiResponse.stdout.indexOf('{');
          const jsonEndIndex = pythonApiResponse.stdout.lastIndexOf('}') + 1;
          
          if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
            const jsonPart = pythonApiResponse.stdout.substring(jsonStartIndex, jsonEndIndex);
            console.log('Extracted JSON:', jsonPart.substring(0, 100) + '...');
            
            try {
              const rawResponseData = JSON.parse(jsonPart);
              
              // Process the response based on the model type
              console.log('Processing response with field mapping for model:', modelProvider);
              
              // Normalize model name
              const normalizedModelProvider = modelProvider.toLowerCase() === 'claude' 
                ? 'anthropic' 
                : modelProvider.toLowerCase();
                
              // Apply field mapping to standardize model-specific responses
              const mappedFields = mapPythonResponseToDbFields(rawResponseData, normalizedModelProvider);
              console.log('Mapped fields:', Object.keys(mappedFields).join(', '));
              
              // Create a response with all available fields
              responseData = {
                ...rawResponseData,
                ...mappedFields
              };
              
              console.log('Final processed response data keys:', Object.keys(responseData));
            } catch (innerParseError) {
              console.error('Failed to parse extracted JSON part:', innerParseError);
              throw innerParseError; // Rethrow to be caught by outer catch
            }
          } else {
            // If we couldn't find JSON brackets, try to parse the entire output as JSON
            try {
              const rawResponseData = JSON.parse(pythonApiResponse.stdout);
              
              // Apply the same mapping for consistent handling
              const normalizedModelProvider = modelProvider.toLowerCase() === 'claude' 
                ? 'anthropic' 
                : modelProvider.toLowerCase();
                
              const mappedFields = mapPythonResponseToDbFields(rawResponseData, normalizedModelProvider);
              responseData = {
                ...rawResponseData,
                ...mappedFields
              };
            } catch (fullParseError) {
              console.error('Failed to parse full output as JSON:', fullParseError);
              throw fullParseError; // Rethrow to be caught by outer catch
            }
          }
        } catch (parseError) {
          console.error('Failed to parse Python script response as JSON:', parseError);
          console.log('Raw output (first 200 chars):', pythonApiResponse.stdout.substring(0, 200));
          
          // Check if the error is due to API key failure - if so, don't use old database data
          const isApiKeyError = pythonApiResponse.stdout.includes('401') || 
                                pythonApiResponse.stdout.includes('Incorrect API key') ||
                                pythonApiResponse.stdout.includes('AuthenticationError');
          
          if (isApiKeyError) {
            console.log('API key error detected - will not use old database data');
            // Throw error to be caught by outer catch block which will use simulated responses
            throw new Error(`API key error: ${pythonApiResponse.stdout.substring(0, 200)}`);
          }
          
          // If it's not an API key error, try to get response from database (might be a parsing issue but response was saved)
          try {
            console.log('Attempting to retrieve response from database (non-API-key error)');
            const dbResponse = await storage.getExcelRequirementResponseById(Number(requirementId));
            
            // Only use database response if it matches the requested model provider
            if (dbResponse && dbResponse.modelProvider && 
                dbResponse.modelProvider.toLowerCase() === modelProvider.toLowerCase()) {
              console.log('Successfully retrieved matching response from database');
              responseData = {
                id: dbResponse.id,
                finalResponse: dbResponse.finalResponse,
                openaiResponse: dbResponse.openaiResponse,
                anthropicResponse: dbResponse.anthropicResponse,
                deepseekResponse: dbResponse.deepseekResponse,
                moaResponse: dbResponse.moaResponse,
                modelProvider: dbResponse.modelProvider,
                success: true,
                message: 'Response retrieved from database'
              };
            } else {
              // Database has old/different model response - return error instead of using old data
              console.log('Database has different model response - returning error');
              throw new Error('Database response does not match requested model');
            }
          } catch (dbError) {
            console.error('Failed to retrieve matching response from database:', dbError);
            // Re-throw original parse error to return proper error response
            throw parseError;
          }
        }
        
        // If we get here, we have valid responseData from Python or database
        if (!responseData) {
          throw new Error('No response data available');
        }
        
        // Handle error responses from the Python script
        if (responseData.error) {
          console.error('Python script returned an error:', responseData.error);
          throw new Error(responseData.error);
        }
        
        // Log the response details
        console.log('==== DETAILED RESPONSE DEBUG - /api/generate-response ====');
        console.log('Response fields:');
        console.log('- generated_response:', responseData.finalResponse ? 'Present' : 'Not present');
        console.log('- openai_response:', responseData.openaiResponse ? 'Present' : 'Not present');
        console.log('- anthropic_response:', responseData.anthropicResponse ? 'Present' : 'Not present');
        console.log('- deepseek_response:', responseData.deepseekResponse ? 'Present' : 'Not present');
        
        // Save the response to the database
        try {
          // Normalize model name
          const normalizedModelProvider = modelProvider.toLowerCase() === 'claude' 
            ? 'anthropic' 
            : modelProvider.toLowerCase();
            
          console.log(`Model provider: ${modelProvider}, normalized: ${normalizedModelProvider}`);
          
          // Debugging the response data
          console.log('ResponseData debug:');
          console.log(JSON.stringify(responseData, null, 2));
          
          // Prepare the update object
          const updateData: any = {
            // Set final response from the appropriate field based on model
            finalResponse: responseData.finalResponse || 
              (normalizedModelProvider === 'anthropic'
                ? responseData.anthropicResponse 
                : normalizedModelProvider === 'openai'
                  ? responseData.openaiResponse
                  : normalizedModelProvider === 'deepseek'
                    ? responseData.deepseekResponse
                    : normalizedModelProvider === 'moa'
                      ? responseData.moaResponse
                      : null),
            modelProvider: responseData.modelProvider || normalizedModelProvider
          };
          
          // Set model-specific responses
          if (responseData.openaiResponse) updateData.openaiResponse = responseData.openaiResponse;
          if (responseData.anthropicResponse) updateData.anthropicResponse = responseData.anthropicResponse;
          if (responseData.deepseekResponse) updateData.deepseekResponse = responseData.deepseekResponse;
          if (responseData.moaResponse) updateData.moaResponse = responseData.moaResponse;
          
          // Update the record in the database
          await storage.updateExcelRequirementResponse(Number(requirementId), updateData);
          
          console.log(`Updated requirement ${requirementId} in database with generated response`);
        } catch (dbError) {
          console.error(`Failed to update database for requirement ${requirementId}:`, dbError);
          // Continue processing - we'll return the response even if DB update fails
        }
        
        // Return the response
        return res.status(200).json({ 
          success: true,
          message: `Response generated for requirement ${requirementId} with model ${modelProvider}`,
          requirementId,
          model: modelProvider,
          ...responseData
        });
      } catch (pythonError) {
        // RELIABILITY: Return error instead of simulated responses
        // Simulated responses corrupt data and hide outages
        console.error(`==== LLM GENERATION FAILED ====`);
        console.error(`Requirement ID: ${requirementId}`);
        console.error(`Model Provider: ${modelProvider}`);
        console.error(`Error type: ${pythonError instanceof Error ? pythonError.constructor.name : typeof pythonError}`);
        console.error(`Error message: ${pythonError instanceof Error ? pythonError.message : String(pythonError)}`);
        if (pythonError instanceof Error && pythonError.stack) {
          console.error(`Error stack:\n${pythonError.stack}`);
        }
        
        // Return explicit error - don't corrupt database with placeholder data
        return res.status(500).json({ 
          success: false,
          error: `Failed to generate LLM response: ${pythonError instanceof Error ? pythonError.message : String(pythonError)}`,
          requirementId,
          model: modelProvider,
          message: 'LLM generation failed. Please check API keys and try again.'
        });
      }
    } catch (error) {
      console.error('Error in generate-response:', error);
      return res.status(500).json({ message: 'Failed to generate response', error: String(error) });
    }
  });

  // API key validation check
  // Find similar matches for a requirement
  app.get('/api/find-similar-matches/:requirementId', async (req: Request, res: Response) => {
    try {
      const requirementId = req.params.requirementId;
      
      if (!requirementId) {
        return res.status(400).json({ message: 'Requirement ID is required' });
      }
      
      console.log(`Finding similar matches for requirement ID: ${requirementId}`);
      
      // SECURITY: Validate requirement ID and use spawn() instead of exec()
      const validatedRequirementId = validateRequirementId(requirementId);
      
      const pythonResponse = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
        const projectRoot = getProjectRoot();
        const pythonScriptPath = path.join(projectRoot, 'find_matches_wrapper.py');
        console.log(`Finding similar matches - Python script: ${pythonScriptPath}, CWD: ${projectRoot}`);
        const pythonProcess = spawn('python3', [
          pythonScriptPath,
          validatedRequirementId.toString()
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env,
          cwd: projectRoot
        });

        let stdout = '';
        let stderr = '';
        const timeout = setTimeout(() => {
          pythonProcess.kill('SIGTERM');
          reject(new Error('Python script timeout after 120 seconds'));
        }, 120000); // 120-second timeout (2 minutes) for similarity search processing

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          resolve({ stdout, stderr, code });
        });

        pythonProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      console.log('Python script response:', pythonResponse.stdout);
      
      // Try to parse the response
      try {
        const data = JSON.parse(pythonResponse.stdout);
        return res.status(200).json(data);
      } catch (parseError) {
        console.error('Failed to parse Python script output as JSON:', parseError);
        
        // Return the raw output as a fallback
        return res.status(200).json({
          success: true,
          requirementId,
          rawOutput: pythonResponse.stdout
        });
      }
    } catch (error) {
      console.error('Error finding similar matches:', error);
      return res.status(500).json({ 
        message: 'Failed to find similar matches',
        error: String(error)
      });
    }
  });

  // Get references for a specific Excel requirement response
  app.get("/api/excel-requirements/:id/references", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      console.log(`Fetching references for requirement ID: ${id}`);
      
      // First check if this requirement has similarQuestions data already
      const requirement = await storage.getExcelRequirementResponse(id);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      
      // Check if similarQuestions exists and parse it if it's a string
      let similarQuestionsList = [];
      
      if (requirement.similarQuestions) {
        try {
          // If it's a string (from database), parse it
          if (typeof requirement.similarQuestions === 'string') {
            try {
              // Debug logging to help understand the issue
              const firstChars = requirement.similarQuestions.substring(0, 20);
              console.log(`Debug - Similar questions for ${id} starts with: ${firstChars}`);
              
              // Remove any BOM or invalid characters at the start of the JSON string
              let cleanedJson = requirement.similarQuestions.trim();
              if (cleanedJson.startsWith('\uFEFF')) {
                cleanedJson = cleanedJson.substring(1);
              }
              // Handle malformed JSON that might have an extra [ at the beginning
              if (cleanedJson.startsWith('[[') && cleanedJson.endsWith(']]')) {
                cleanedJson = cleanedJson.substring(1, cleanedJson.length - 1);
              }
              
              similarQuestionsList = JSON.parse(cleanedJson);
            } catch (innerError) {
              console.error(`JSON parsing failed for requirement ${id}, error:`, innerError);
              console.error(`First 50 chars of problematic JSON: "${requirement.similarQuestions.substring(0, 50)}"`);
              similarQuestionsList = [];
            }
          } 
          // If it's already an array, use it directly
          else if (Array.isArray(requirement.similarQuestions)) {
            similarQuestionsList = requirement.similarQuestions;
          }
          
          if (Array.isArray(similarQuestionsList) && similarQuestionsList.length > 0) {
            console.log(`Found ${similarQuestionsList.length} similar questions in database for requirement ${id}`);
          } else {
            console.log(`No valid similar questions found for requirement ${id}`);
            similarQuestionsList = [];
          }
        } catch (parseError) {
          console.error(`Error processing similarQuestions for requirement ${id}:`, parseError);
          similarQuestionsList = [];
        }
      }
      
      if (similarQuestionsList.length > 0) {
        // Format the similar questions data to match the Reference interface expected by the frontend
        const references = similarQuestionsList.map((item: any, index: number) => ({
          id: index + 1,
          responseId: id,
          category: item.customer || item.category || 'Unknown',  // Use customer field first
          requirement: item.question || item.requirement || '',
          response: item.response || '',
          reference: item.reference || (item.id ? `#${item.id}` : undefined),
          score: parseFloat(item.similarity_score) || 0  // Parse string score to number
        }));
        
        return res.json(references);
      }
      
      // If we don't have stored similar questions, try to fetch them using find_matches
      console.log(`No similar questions found in database for requirement ${id}, fetching from find_matches...`);
      try {
        // SECURITY: Validate ID and use spawn() instead of exec()
        const validatedId = validateRequirementId(id);
        
        const pythonResponse = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
          const projectRoot = getProjectRoot();
          const pythonScriptPath = path.join(projectRoot, 'find_matches_wrapper.py');
          console.log(`Fetching references - Python script: ${pythonScriptPath}, CWD: ${projectRoot}`);
          const pythonProcess = spawn('python3', [
            pythonScriptPath,
            validatedId.toString()
          ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env,
            cwd: projectRoot
          });

          let stdout = '';
          let stderr = '';
          const timeout = setTimeout(() => {
            pythonProcess.kill('SIGTERM');
            reject(new Error('Python script timeout after 60 seconds'));
          }, 60000);

          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            resolve({ stdout, stderr, code });
          });

          pythonProcess.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        const data = JSON.parse(pythonResponse.stdout);
        
        if (data.success && data.similar_matches && Array.isArray(data.similar_matches)) {
          // Format the data for the References panel
          // IMPORTANT: Use the reference field from embeddings table (document name like "Maybank RFP.xlsx_5_Functional_(AP)")
          const references = data.similar_matches.map((item: any, index: number) => ({
            id: index + 1,
            responseId: id,
            category: item.customer || item.category || 'Unknown',  // Use customer field first
            requirement: item.requirement || '',
            response: item.response || '',
            reference: item.reference || (item.id ? `#${item.id}` : undefined),  // Use reference from embeddings table (document name)
            score: item.similarity_score || 0
          }));
          
          // Update the database with the new similar questions data
          await storage.updateSimilarQuestions(id, data.similar_matches);
          
          return res.json(references);
        } else {
          // Return empty array if no similar matches found
          return res.json([]);
        }
      } catch (pythonError) {
        console.error('Error executing Python script for finding similar matches:', pythonError);
        throw new Error('Failed to execute similar matches search');
      }
    } catch (error) {
      console.error("Error fetching references:", error);
      return res.status(500).json({ message: "Failed to fetch references" });
    }
  });
  
  // Update response content endpoint
  app.post('/api/excel-requirements/:id/update-response', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { finalResponse } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      if (finalResponse === undefined) {
        return res.status(400).json({ message: "finalResponse is required" });
      }
      
      console.log(`Updating response content for requirement ID: ${id}`);
      
      // Update the response in the database
      const result = await storage.updateExcelRequirementResponse(id, { 
        finalResponse 
      });
      
      if (!result) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      return res.json({ 
        success: true, 
        message: "Response updated successfully",
        finalResponse
      });
    } catch (error) {
      console.error("Error updating response content:", error);
      return res.status(500).json({ 
        message: "Failed to update response content",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update EKG subrequirement availability selections
  app.post('/api/excel-requirements/:id/ekg/subrequirements-availability', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { availableIds } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      if (!Array.isArray(availableIds)) {
        return res.status(400).json({ message: "availableIds must be an array" });
      }

      const normalizedIds = availableIds.map((v: any) => String(v)).filter((v: string) => v.trim() !== '');
      
      await storage.updateExcelRequirementResponse(id, { 
        ekgSubrequirementsAvailable: JSON.stringify(normalizedIds)
      });

      return res.json({
        success: true,
        availableIds: normalizedIds
      });
    } catch (error) {
      console.error("Error updating EKG subrequirement availability:", error);
      return res.status(500).json({ 
        message: "Failed to update EKG subrequirement availability",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Regenerate customer response using marked-available subrequirements
  app.post('/api/excel-requirements/:id/ekg/regenerate', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { availableIds } = req.body || {};

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const record = await storage.getExcelRequirementResponseById(id);
      if (!record) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      const subrequirements = (() => {
        try {
          if (record.ekgSubrequirements) {
            const parsed = JSON.parse(record.ekgSubrequirements);
            return Array.isArray(parsed) ? parsed : [];
          }
        } catch (err) {
          console.error("Failed to parse ekgSubrequirements", err);
        }
        return [];
      })();

      const storedAvailableIds = (() => {
        try {
          if ((record as any).ekgSubrequirementsAvailable) {
            const parsed = JSON.parse((record as any).ekgSubrequirementsAvailable as string);
            return Array.isArray(parsed) ? parsed.map(String) : [];
          }
        } catch (err) {
          console.error("Failed to parse ekgSubrequirementsAvailable", err);
        }
        return [];
      })();

      const selectedIds: string[] = Array.isArray(availableIds) 
        ? availableIds.map((v: any) => String(v))
        : storedAvailableIds;

      const selectedSubrequirements = subrequirements.filter((sr: any) => selectedIds.includes(String(sr?.id)));

      if (selectedSubrequirements.length === 0) {
        return res.status(400).json({ message: "No subrequirements marked as available. Please select at least one." });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ success: false, message: "Missing OPENAI_API_KEY" });
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const availableFeatures = selectedSubrequirements.map((sr: any) => {
        const title = sr?.title || sr?.description || sr?.id || "Subrequirement";
        const desc = sr?.description ? `: ${sr.description}` : '';
        return `${title}${desc}`;
      });

      const regeneratePrompt = `
You are a Senior Wealth Management Pre-Sales Consultant for Intellect Wealth. Regenerate a formal RFP "Customer Response" that will be sent directly to a client, so it must be professional, concise, confident, and customer-friendly.

Original customer requirement:

${record.requirement || ''}

The following subrequirements have now been CONFIRMED as available features of the platform. For this regeneration, you must treat ALL of them as fully supported today, even if they were previously marked as partial or not available:

${availableFeatures.map((f, idx) => `${idx + 1}. ${f}`).join('\n')}

DEFINITION OF "Customer Response" (MANDATORY):

- This is the customer-facing narrative that will appear in the RFP response.

- It must synthesise the confirmed available subrequirements into a cohesive explanation of how Intellect Wealth supports the requirement.

- It should read as a polished answer in a formal RFP.

WHAT THE CUSTOMER RESPONSE MUST DO:

- Emphasise how the platform supports the requirement end-to-end using the listed available features.

- Focus only on the confirmed available subrequirements above.

- You may group or paraphrase them, but do NOT invent new capabilities that are not implied by them.

- Do NOT mention, hint at, or allude to any unavailable items, partial fitment, gaps, or limitations.

- Do NOT say that any of these features are partial, unavailable, or requiring customisation. For this narrative, they are fully available.

INTELLECT-SPECIFIC MESSAGING (WHEN RELEVANT):

- If any listed feature clearly relates to integration, you may mention:

  "Integration can be achieved using Intellect's proprietary iTurmeric platform, which provides low-code APIs, adapters and orchestration for external systems."

- If any listed feature clearly relates to reporting, you may mention:

  "Reports can be developed using Intellect's proprietary CTSigma reporting suite, offering dashboards, scheduled reports and configurable drill-down analytics."

LANGUAGE RULES (STRICT):

- Tone: professional, confident, and positive; suitable for formal RFP documentation.

- Use active voice and present tense: "supports", "enables", "provides", "includes".

- Focus on what the platform CAN do.

- Avoid negative or hedging terms such as: "not evidenced", "not explicitly", "appears to", "seems to", "may not", "lacks", "missing", "unavailable".

- Do NOT mention tools, prompts, AI, vector stores, or internal reasoning.

- Write a cohesive narrative (1–3 short paragraphs), not a bullet list.

- Maximum length: 200 words.

OUTPUT FORMAT (STRICT):

Return ONLY a single JSON object (no backticks, no extra text) in this exact format:

{
  "Customer Response": "narrative text here (no more than 200 words)"
}
`;

      let regenerated;
      try {
        console.log(`[REGENERATE] Calling OpenAI Responses API for requirement ${id} with ${selectedSubrequirements.length} available subrequirements`);
        // Use responses API (Assistants API) for regeneration
        // Try gpt-5.1 first, fallback to gpt-4o if not available
        let aiResp;
        let lastError: any = null;
        const modelsToTry = ["gpt-5.1", "gpt-4o"];
        
        for (const modelName of modelsToTry) {
          try {
            console.log(`[REGENERATE] Attempting with model: ${modelName}`);
            aiResp = await client.responses.create({
              model: modelName,
              input: regeneratePrompt,
            });
            console.log(`[REGENERATE] Success with model: ${modelName}`);
            break; // Success, exit loop
          } catch (err: any) {
            console.error(`[REGENERATE] Failed with model ${modelName}:`, err?.message);
            lastError = err;
            if (modelName === modelsToTry[modelsToTry.length - 1]) {
              // Last model failed, throw error
              throw err;
            }
            // Try next model
            console.log(`[REGENERATE] Trying next model...`);
          }
        }
        
        if (!aiResp) {
          throw lastError || new Error("Failed to get response from OpenAI");
        }
        const rawText = aiResp?.output_text || '';
        console.log(`[REGENERATE] Received response from OpenAI, length: ${rawText.length}`);
        regenerated = (() => {
          const start = rawText.indexOf('{');
          const end = rawText.lastIndexOf('}');
          const jsonText = start >= 0 && end > start ? rawText.substring(start, end + 1) : rawText;
          try {
            return JSON.parse(jsonText);
          } catch (parseErr) {
            console.error("[REGENERATE] Failed to parse JSON from OpenAI response:", parseErr);
            console.error("[REGENERATE] Raw text:", rawText.substring(0, 500));
            throw parseErr;
          }
        })();
        console.log(`[REGENERATE] Successfully parsed regenerated response`);
      } catch (err: any) {
        console.error("[REGENERATE] Error regenerating customer response:", err);
        console.error("[REGENERATE] Error message:", err?.message);
        console.error("[REGENERATE] Error stack:", err?.stack);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to regenerate response",
          error: err?.message || String(err)
        });
      }

      // Extract customer response - check for "Customer Response" (new format) or fallback to old format
      const customerResponse = regenerated?.["Customer Response"] || regenerated?.customer_response || regenerated?.response || '';
      const regeneratedFeatures = Array.isArray(regenerated?.available_features) ? regenerated.available_features : availableFeatures;

      const updateData: any = {
        finalResponse: customerResponse || record.finalResponse,
        ekgCustomerResponse: customerResponse || record.ekgCustomerResponse,
        ekgAvailableFeatures: JSON.stringify(regeneratedFeatures),
        ekgSubrequirementsAvailable: JSON.stringify(selectedIds),
      };

      await storage.updateExcelRequirementResponse(id, updateData);

      return res.json({
        success: true,
        finalResponse: updateData.finalResponse,
        ekgCustomerResponse: updateData.ekgCustomerResponse,
        ekgAvailableFeatures: regeneratedFeatures,
        ekgSubrequirementsAvailable: selectedIds,
      });
    } catch (error) {
      console.error("Error regenerating response:", error);
      return res.status(500).json({ 
        message: "Failed to regenerate response",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save elaborated requirement endpoint
  app.post('/api/excel-requirements/:id/elaborate', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { elaboratedRequirement } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      if (elaboratedRequirement === undefined) {
        return res.status(400).json({ message: "elaboratedRequirement is required" });
      }
      
      console.log(`Saving elaborated requirement for ID: ${id}`);
      console.log(`Elaborated text: ${elaboratedRequirement?.substring(0, 100)}...`);
      
      // Update the elaborated requirement in the database
      const result = await storage.updateExcelRequirementResponse(id, { 
        elaboratedRequirement: elaboratedRequirement.trim() || null
      });
      
      if (!result) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      
      return res.json({ 
        success: true, 
        message: "Elaborated requirement saved successfully",
        elaboratedRequirement: result.elaboratedRequirement
      });
    } catch (error) {
      console.error("Error saving elaborated requirement:", error);
      return res.status(500).json({ 
        message: "Failed to save elaborated requirement",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate LLM response for a requirement using call_llm.py
  app.post('/api/generate-llm-response', async (req: Request, res: Response) => {
    try {
      const { requirementId, model = 'moa' } = req.body;
      
      if (!requirementId) {
        return res.status(400).json({ message: 'Requirement ID is required' });
      }
      
      // Import the API key validation utility
      const { isApiKeyAvailable, getMissingApiKeyMessage } = require('./apiKeyUtils');
      
      // Check if the API key for the requested model is available
      if (!isApiKeyAvailable(model)) {
        const errorMessage = getMissingApiKeyMessage(model);
        console.error(`API key missing error: ${errorMessage}`);
        return res.status(400).json({
          success: false,
          message: 'API key not available',
          error: errorMessage
        });
      }
      
      console.log(`Generating LLM response for requirement ID ${requirementId} using model ${model}`);
      
      // SECURITY: Validate inputs and use spawn() instead of exec()
      const validatedRequirementId = validateRequirementId(requirementId);
      const validatedModel = validateModelName(model);
      
      // Call Python script securely using wrapper
      const pythonResponse = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
        const projectRoot = getProjectRoot();
        const pythonScriptPath = path.join(projectRoot, 'call_llm_wrapper.py');
        console.log(`Generating LLM response - Python script: ${pythonScriptPath}, CWD: ${projectRoot}`);
        const pythonProcess = spawn('python3', [
          pythonScriptPath,
          validatedRequirementId.toString(),
          validatedModel,
          'false'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env,
          cwd: projectRoot
        });

        let stdout = '';
        let stderr = '';
        const timeout = setTimeout(() => {
          pythonProcess.kill('SIGTERM');
          reject(new Error('Python script timeout after 120 seconds'));
        }, 120000); // 120-second timeout (2 minutes) for similarity search processing

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          resolve({ stdout, stderr, code });
        });

        pythonProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      console.log('Python script response:', pythonResponse.stdout);
      
      try {
        // Parse the response
        const data = JSON.parse(pythonResponse.stdout);
        
        if (data.success === false) {
          console.error('Error in Python LLM call:', data.error);
          return res.status(500).json({
            success: false,
            message: 'Failed to generate response',
            error: data.error
          });
        }
        
        // Return the response data
        return res.status(200).json(data);
      } catch (parseError) {
        console.error('Failed to parse Python script output as JSON:', parseError);
        console.log('Raw output:', pythonResponse.stdout);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to parse response from LLM',
          error: String(parseError),
          rawOutput: pythonResponse.stdout
        });
      }
    } catch (error) {
      console.error('Error generating LLM response:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate LLM response',
        error: String(error)
      });
    }
  });
  
  app.get('/api/validate-keys', async (_req: Request, res: Response) => {
    // Import the API key validation utility
    const { validateApiKeys, getModelAvailability } = require('./apiKeyUtils');
    
    // Check if we have the necessary API keys in the environment
    const apiKeys = validateApiKeys();
    const modelAvailability = getModelAvailability();
    
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

  // Map events to a requirement using OpenAI Responses API
  app.post("/api/map-events", async (req: Request, res: Response) => {
    try {
      const requirementId = Number(req.body.requirementId);
      if (!requirementId || Number.isNaN(requirementId)) {
        return res.status(400).json({ success: false, message: "requirementId is required" });
      }

      const record = await storage.getExcelRequirementResponse(requirementId);
      if (!record) {
        return res.status(404).json({ success: false, message: "Requirement not found" });
      }

      const resp1 = record.finalResponse || record.openaiResponse || record.anthropicResponse || record.deepseekResponse || record.moaResponse;
      if (!resp1) {
        return res.status(400).json({ success: false, message: "No response text available to map events" });
      }

      // Check if the response indicates the feature is not available
      // If so, skip event mapping and return empty mappings
      const NO_REFERENCE_MESSAGE = "This feature/capability is not available in our reference database. No matching documentation was found for this requirement.";
      if (resp1.trim() === NO_REFERENCE_MESSAGE || resp1.includes("not available in our reference database")) {
        // Clear any existing event mappings since feature is not available
        await storage.updateExcelRequirementResponse(requirementId, { eventMappings: JSON.stringify({ event1: null, event2: null, event3: null }) } as any);
        
        return res.status(200).json({
          success: true,
          requirementId,
          eventMappings: { event1: null, event2: null, event3: null },
          message: "Feature not available - no events mapped"
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ success: false, message: "Missing OPENAI_API_KEY" });
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const input = `
resp1 = '''${resp1}'''

input = '''
You are given a natural language description of a requirement:

{resp1}

You also have a list of event documents, where each event is represented by a filename.
Each filename has the format:
"EID003 - Customer Management_eMACH_User_Manual.docx"

From the filename:
- The event name is only the first part before the second underscore and before the file extension, e.g. "EID003 - Customer Management".
- Ignore the rest of the filename contents.

Your task:
1. Compare the given requirement description to all available events.
2. Identify the top three events that most closely match the requirement.
3. Assign a confidence score between 0 and 1 for each selected event.
4. Exclude any event whose confidence score is less than 0.60.

Output format (very important):
- Return ONLY a single JSON object.
- The keys must be event1, event2, and event3.
- The values must be the event name (as extracted above) and the confidence score, in this exact format:

{
  "event1": {
    "name": "<event name>",
    "confidence": <confidence score>
  },
  "event2": {
    "name": "<event name>",
    "confidence": <confidence score>
  },
  "event3": {
    "name": "<event name>",
    "confidence": <confidence score>
  }
}

Rules:
- Do not include any explanation, comments, or extra text.
- If there are fewer than three events with confidence >= 0.60, still return event1–event3 keys, but set the missing ones to null, like:
  "event3": null
- Recheck that the output is valid JSON and strictly follows the format above before returning it.
'''
`;

      const vectorStoreId = 'vs_69280c8c3ce48191ae7509ff03ecfb78';

      const aiResponse = await client.responses.create({
        model: "gpt-4o-mini",
        input,
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId]
          }
        ]
      });

      const rawText = (aiResponse as any).output_text ||
        (Array.isArray((aiResponse as any).output) ? (aiResponse as any).output.map((o: any) => o.content || o.text || "").join("\n") : "") ||
        "";

      const jsonText = (() => {
        if (!rawText) return "";
        const start = rawText.indexOf("{");
        const end = rawText.lastIndexOf("}");
        if (start >= 0 && end > start) return rawText.substring(start, end + 1);
        return rawText.trim();
      })();

      let parsed: any = null;
      try {
        parsed = JSON.parse(jsonText);
      } catch (err) {
        console.error("Failed to parse map-events JSON:", rawText);
        return res.status(500).json({ success: false, message: "Failed to parse events JSON" });
      }

      const eventMappings = {
        event1: parsed.event1 || null,
        event2: parsed.event2 || null,
        event3: parsed.event3 || null
      };

      await storage.updateExcelRequirementResponse(requirementId, { eventMappings: JSON.stringify(eventMappings) } as any);

      return res.status(200).json({
        success: true,
        requirementId,
        eventMappings
      });
    } catch (error: any) {
      console.error("Error in map-events:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to map events" });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
