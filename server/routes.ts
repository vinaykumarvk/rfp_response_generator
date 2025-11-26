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
        rfpName, 
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
      
      try {
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

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}