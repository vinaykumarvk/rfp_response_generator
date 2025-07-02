// Field mapping utility to convert between Python script and database field names
// This helps us properly map model-specific response fields

/**
 * Map Python script response fields to database column names
 * 
 * Python script uses snake_case for field names:
 * - openai_response
 * - anthropic_response
 * - deepseek_response
 * - generated_response
 * 
 * Database uses camelCase:
 * - openaiResponse
 * - anthropicResponse
 * - deepseekResponse
 * - moaResponse
 * - finalResponse
 * 
 * @param {Object} pythonOutput - JSON response from Python script
 * @param {string} provider - The model provider name ('openai', 'anthropic', 'deepseek', 'moa')
 * @returns {Object} Object with mapped field names ready for database
 */
export function mapPythonResponseToDbFields(pythonOutput, provider) {
  // Start with empty values for all fields
  const mappedFields = {
    finalResponse: null,
    openaiResponse: null,
    anthropicResponse: null,
    deepseekResponse: null,
    moaResponse: null
  };
  
  // DEBUG: Show all available fields in pythonOutput
  console.log("FIELD MAPPING DEBUG - Available keys in pythonOutput:");
  Object.keys(pythonOutput).forEach(key => {
    if (typeof pythonOutput[key] === 'string') {
      console.log(`- ${key}: ${pythonOutput[key].substring(0, 30)}... (${pythonOutput[key].length} chars)`);
    } else {
      console.log(`- ${key}: ${JSON.stringify(pythonOutput[key]).substring(0, 30)}...`);
    }
  });
  
  // Check for finalResponse directly (Python returns camelCase)
  if (pythonOutput.finalResponse) {
    mappedFields.finalResponse = pythonOutput.finalResponse;
    console.log(`Found finalResponse (${pythonOutput.finalResponse.length} chars), using as finalResponse`);
  }
  
  // Map model-specific fields based on provider (Python returns camelCase)
  if (provider === "openai" && pythonOutput.openaiResponse) {
    mappedFields.openaiResponse = pythonOutput.openaiResponse;
    console.log(`Found openaiResponse (${pythonOutput.openaiResponse.length} chars), mapped to openaiResponse`);
    
    // For single-model response, also set as finalResponse if not already set
    if (!mappedFields.finalResponse) {
      mappedFields.finalResponse = pythonOutput.openaiResponse;
      console.log("Using openaiResponse as finalResponse");
    }
  }
  
  if (provider === "anthropic" && pythonOutput.anthropicResponse) {
    mappedFields.anthropicResponse = pythonOutput.anthropicResponse;
    console.log(`Found anthropicResponse (${pythonOutput.anthropicResponse.length} chars), mapped to anthropicResponse`);
    
    // For single-model response, also set as finalResponse if not already set
    if (!mappedFields.finalResponse) {
      mappedFields.finalResponse = pythonOutput.anthropicResponse;
      console.log("Using anthropicResponse as finalResponse");
    }
  }
  
  if (provider === "deepseek" && pythonOutput.deepseekResponse) {
    mappedFields.deepseekResponse = pythonOutput.deepseekResponse;
    console.log(`Found deepseekResponse (${pythonOutput.deepseekResponse.length} chars), mapped to deepseekResponse`);
    
    // For single-model response, also set as finalResponse if not already set
    if (!mappedFields.finalResponse) {
      mappedFields.finalResponse = pythonOutput.deepseekResponse;
      console.log("Using deepseekResponse as finalResponse");
    }
  }
  
  if (provider === "moa") {
    // MOA might store individual model responses separately and also a combined version
    
    // Individual model responses (Python returns camelCase)
    if (pythonOutput.openaiResponse) {
      mappedFields.openaiResponse = pythonOutput.openaiResponse;
      console.log(`Found openaiResponse in MOA result (${pythonOutput.openaiResponse.length} chars)`);
    }
    
    if (pythonOutput.anthropicResponse) {
      mappedFields.anthropicResponse = pythonOutput.anthropicResponse;
      console.log(`Found anthropicResponse in MOA result (${pythonOutput.anthropicResponse.length} chars)`);
    }
    
    if (pythonOutput.deepseekResponse) {
      mappedFields.deepseekResponse = pythonOutput.deepseekResponse;
      console.log(`Found deepseekResponse in MOA result (${pythonOutput.deepseekResponse.length} chars)`);
    }
    
    // Combined MOA response (Python returns camelCase)
    if (pythonOutput.finalResponse) {
      mappedFields.moaResponse = pythonOutput.finalResponse;
      mappedFields.finalResponse = pythonOutput.finalResponse;
      console.log(`Using finalResponse (${pythonOutput.finalResponse.length} chars) as moaResponse and finalResponse`);
    } else if (mappedFields.openaiResponse && mappedFields.anthropicResponse) {
      // Combine responses if no finalResponse is available
      const combinedResponse = `## Combined MOA Response\n\n### OpenAI:\n${mappedFields.openaiResponse}\n\n### Anthropic:\n${mappedFields.anthropicResponse}`;
      mappedFields.moaResponse = combinedResponse;
      mappedFields.finalResponse = combinedResponse;
      console.log("Created combined MOA response from individual model responses");
    }
  }
  
  // Log validation
  const fieldStatus = Object.entries(mappedFields)
    .map(([key, value]) => `${key}: ${value ? `Present (${value.length} chars)` : 'Not present'}`)
    .join('\n  ');
  
  console.log(`FIELD MAPPING RESULTS:\n  ${fieldStatus}`);
  
  return mappedFields;
}

// In ES modules, we use named exports above instead of module.exports