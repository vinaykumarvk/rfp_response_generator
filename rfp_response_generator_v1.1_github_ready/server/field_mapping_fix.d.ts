/**
 * Type definitions for field_mapping_fix.js
 */

/**
 * Maps Python script response fields to database column names
 * 
 * @param pythonOutput - JSON response from Python script
 * @param provider - The model provider name ('openai', 'anthropic', 'deepseek', 'moa')
 * @returns Object with mapped field names ready for database
 */
export function mapPythonResponseToDbFields(
  pythonOutput: Record<string, any>,
  provider: string
): {
  finalResponse: string | null;
  openaiResponse: string | null;
  anthropicResponse: string | null;
  deepseekResponse: string | null;
  moaResponse: string | null;
};