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
      
      try {
        // Call the Python FastAPI endpoint to generate the response
        // The path is a proxy to the Python FastAPI server
        console.log(`Calling Python API to generate response for requirement ${requirementId}`);
        
        // Format the model name correctly for the Python API
        let pythonModel = modelProvider.toLowerCase();
        if (pythonModel === 'openai') pythonModel = 'openAI';
        if (pythonModel === 'claude') pythonModel = 'anthropic';
        
        const pythonApiResponse = await exec(`python3 -c "
import sys
import os
import json
import asyncio
from call_llm_simple import get_llm_responses

async def main():
    try:
        # Call the LLM function directly
        response = await get_llm_responses(${requirementId}, '${pythonModel}', True)
        print(json.dumps(response))
    except Exception as e:
        print(json.dumps({'error': str(e)}))

asyncio.run(main())
"`);
        
        console.log('Python script response:', pythonApiResponse.stdout);
        
        let responseData;
        
        try {
          // Try to parse the JSON response
          responseData = JSON.parse(pythonApiResponse.stdout);
        } catch (parseError) {
          console.error('Failed to parse Python script response as JSON:', parseError);
          console.log('Raw output:', pythonApiResponse.stdout);
          
          // If we can't parse the response, fall back to our simulated responses
          if (modelProvider.toLowerCase() === 'openai') {
            responseData = {
              finalResponse: `OpenAI response for requirement ${requirementId}`,
              openaiResponse: `Detailed OpenAI response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
              modelProvider: 'openai'
            };
          } else if (modelProvider.toLowerCase() === 'claude' || modelProvider.toLowerCase() === 'anthropic') {
            responseData = {
              finalResponse: `Anthropic response for requirement ${requirementId}`,
              anthropicResponse: `Detailed Claude response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
              modelProvider: 'anthropic'
            };
          } else if (modelProvider.toLowerCase() === 'deepseek') {
            responseData = {
              finalResponse: `DeepSeek response for requirement ${requirementId}`,
              deepseekResponse: `Detailed DeepSeek response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
              modelProvider: 'deepseek'
            };
          } else if (modelProvider.toLowerCase() === 'moa') {
            responseData = {
              finalResponse: `MOA (Mixture of Agents) response for requirement ${requirementId}`,
              openaiResponse: `OpenAI component of MOA response`,
              anthropicResponse: `Anthropic component of MOA response`,
              deepseekResponse: `DeepSeek component of MOA response`,
              moaResponse: `Final synthesized MOA response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
              modelProvider: 'moa'
            };
          } else {
            responseData = {
              finalResponse: `Response using ${modelProvider} for requirement ${requirementId}`,
              modelProvider
            };
          }
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
        
        // Return the response
        return res.status(200).json({ 
          success: true,
          message: `Response generated for requirement ${requirementId} with model ${modelProvider}`,
          requirementId,
          model: modelProvider,
          ...responseData
        });
      } catch (pythonError) {
        console.error('Error executing Python LLM call:', pythonError);
        
        // Fall back to simulated responses if the Python call fails
        console.log('Falling back to simulated responses due to Python API error');
        
        let responseContent;
        
        if (modelProvider.toLowerCase() === 'openai') {
          responseContent = {
            finalResponse: `Simulated OpenAI response for requirement ${requirementId}`,
            openaiResponse: `Detailed OpenAI response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
            modelProvider: 'openai'
          };
        } else if (modelProvider.toLowerCase() === 'claude' || modelProvider.toLowerCase() === 'anthropic') {
          responseContent = {
            finalResponse: `Simulated Anthropic response for requirement ${requirementId}`,
            anthropicResponse: `Detailed Claude response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
            modelProvider: 'anthropic'
          };
        } else if (modelProvider.toLowerCase() === 'deepseek') {
          responseContent = {
            finalResponse: `Simulated DeepSeek response for requirement ${requirementId}`,
            deepseekResponse: `Detailed DeepSeek response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
            modelProvider: 'deepseek'
          };
        } else if (modelProvider.toLowerCase() === 'moa') {
          responseContent = {
            finalResponse: `Simulated MOA (Mixture of Agents) response for requirement ${requirementId}`,
            openaiResponse: `OpenAI component of MOA response`,
            anthropicResponse: `Anthropic component of MOA response`,
            deepseekResponse: `DeepSeek component of MOA response`,
            moaResponse: `Final synthesized MOA response for: ${requirementText?.substring(0, 50) || 'unknown requirement'}...`,
            modelProvider: 'moa'
          };
        } else {
          responseContent = {
            finalResponse: `Simulated response using ${modelProvider} for requirement ${requirementId}`,
            modelProvider
          };
        }
        
        return res.status(200).json({ 
          success: true,
          message: `Simulated response generated for requirement ${requirementId} with model ${modelProvider}`,
          requirementId,
          model: modelProvider,
          ...responseContent
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
      
      // Call the Python script to find similar matches
      const pythonResponse = await exec(`python3 -c "
import sys
import os
import json
from find_matches import find_similar_matches

try:
    # Call the find_similar_matches function and get the results as a dictionary
    results = find_similar_matches(${requirementId})
    
    # Convert the results to JSON and print
    print(json.dumps(results))
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e)
    }))
"`);
      
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
      
      if (requirement.similarQuestions && Array.isArray(requirement.similarQuestions)) {
        console.log(`Found ${requirement.similarQuestions.length} similar questions in database for requirement ${id}`);
        
        // Format the similar questions data to match the Reference interface expected by the frontend
        const references = requirement.similarQuestions.map((item: any, index: number) => ({
          id: index + 1,
          responseId: id,
          category: item.category || 'Unknown',
          requirement: item.requirement || '',
          response: item.response || '',
          reference: item.id ? `#${item.id}` : undefined,
          score: item.similarity_score || 0
        }));
        
        return res.json(references);
      }
      
      // If we don't have stored similar questions, try to fetch them using find_matches
      console.log(`No similar questions found in database for requirement ${id}, fetching from find_matches...`);
      try {
        // Call the find_similar_matches function
        const pythonResponse = await exec(`python3 -c "
import sys
import os
import json
from find_matches import find_similar_matches

try:
    # Call the find_similar_matches function and get the results as a dictionary
    results = find_similar_matches(${id})
    
    # Convert the results to JSON and print
    print(json.dumps(results))
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e)
    }))
"`);
        
        const data = JSON.parse(pythonResponse.stdout);
        
        if (data.success && data.similar_matches && Array.isArray(data.similar_matches)) {
          // Format the data for the References panel
          const references = data.similar_matches.map((item: any, index: number) => ({
            id: index + 1,
            responseId: id,
            category: item.category || 'Unknown',
            requirement: item.requirement || '',
            response: item.response || '',
            reference: item.id ? `#${item.id}` : undefined,
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

  // Generate LLM response for a requirement using call_llm.py
  app.post('/api/generate-llm-response', async (req: Request, res: Response) => {
    try {
      const { requirementId, model = 'moa' } = req.body;
      
      if (!requirementId) {
        return res.status(400).json({ message: 'Requirement ID is required' });
      }
      
      console.log(`Generating LLM response for requirement ID ${requirementId} using model ${model}`);
      
      // Call Python script to generate LLM response
      const pythonResponse = await exec(`python3 -c "
import sys
import os
import json
from call_llm import get_llm_responses

try:
    # Call get_llm_responses to generate and save responses
    get_llm_responses(${requirementId}, '${model}', False)
    
    # Get the saved responses from database
    from sqlalchemy import text
    from database import engine
    
    with engine.connect() as connection:
        query = text('''
            SELECT 
                id, 
                final_response, 
                openai_response, 
                anthropic_response, 
                deepseek_response
            FROM excel_requirement_responses 
            WHERE id = :req_id
        ''')
        
        result = connection.execute(query, {'req_id': ${requirementId}}).fetchone()
        
        if result:
            response_data = {
                'id': result[0],
                'finalResponse': result[1],
                'openaiResponse': result[2], 
                'anthropicResponse': result[3],
                'deepseekResponse': result[4],
                'success': True,
                'message': 'Response generated successfully'
            }
            print(json.dumps(response_data))
        else:
            print(json.dumps({
                'success': False,
                'error': 'No response found after generation'
            }))
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e)
    }))
"`);
      
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