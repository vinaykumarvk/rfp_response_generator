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
function mapPythonResponseToDbFields(pythonOutput, provider) {
  // Start with empty values for all fields
  const mappedFields = {
    finalResponse: null,
    openaiResponse: null,
    anthropicResponse: null,
    deepseekResponse: null,
    moaResponse: null
  };
  
  // Default to generated_response for finalResponse if available
  if (pythonOutput.generated_response) {
    mappedFields.finalResponse = pythonOutput.generated_response;
    console.log(`Found generated_response (${pythonOutput.generated_response.length} chars), using as finalResponse`);
  }
  
  // Map model-specific fields based on provider
  if (provider === "openai" && pythonOutput.openai_response) {
    mappedFields.openaiResponse = pythonOutput.openai_response;
    console.log(`Found openai_response (${pythonOutput.openai_response.length} chars), mapped to openaiResponse`);
    
    // For single-model response, also set as finalResponse if not already set
    if (!mappedFields.finalResponse) {
      mappedFields.finalResponse = pythonOutput.openai_response;
      console.log("Using openai_response as finalResponse");
    }
  }
  
  if (provider === "anthropic" && pythonOutput.anthropic_response) {
    mappedFields.anthropicResponse = pythonOutput.anthropic_response;
    console.log(`Found anthropic_response (${pythonOutput.anthropic_response.length} chars), mapped to anthropicResponse`);
    
    // For single-model response, also set as finalResponse if not already set
    if (!mappedFields.finalResponse) {
      mappedFields.finalResponse = pythonOutput.anthropic_response;
      console.log("Using anthropic_response as finalResponse");
    }
  }
  
  if (provider === "deepseek" && pythonOutput.deepseek_response) {
    mappedFields.deepseekResponse = pythonOutput.deepseek_response;
    console.log(`Found deepseek_response (${pythonOutput.deepseek_response.length} chars), mapped to deepseekResponse`);
    
    // For single-model response, also set as finalResponse if not already set
    if (!mappedFields.finalResponse) {
      mappedFields.finalResponse = pythonOutput.deepseek_response;
      console.log("Using deepseek_response as finalResponse");
    }
  }
  
  if (provider === "moa") {
    // MOA might store individual model responses separately and also a combined version
    
    // Individual model responses
    if (pythonOutput.openai_response) {
      mappedFields.openaiResponse = pythonOutput.openai_response;
      console.log(`Found openai_response in MOA result (${pythonOutput.openai_response.length} chars)`);
    }
    
    if (pythonOutput.anthropic_response) {
      mappedFields.anthropicResponse = pythonOutput.anthropic_response;
      console.log(`Found anthropic_response in MOA result (${pythonOutput.anthropic_response.length} chars)`);
    }
    
    // Combined MOA response
    // Either use generated_response or create one from individual responses
    if (pythonOutput.generated_response) {
      mappedFields.moaResponse = pythonOutput.generated_response;
      mappedFields.finalResponse = pythonOutput.generated_response;
      console.log(`Using generated_response (${pythonOutput.generated_response.length} chars) as moaResponse and finalResponse`);
    } else if (mappedFields.openaiResponse && mappedFields.anthropicResponse) {
      // Combine responses if no generated_response is available
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

// Export the utility function
module.exports = {
  mapPythonResponseToDbFields
};