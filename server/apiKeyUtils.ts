/**
 * Utility functions for API key validation and management
 */

/**
 * Validate that required API keys are available in the environment
 * @returns Object containing validation status for each key
 */
export function validateApiKeys() {
  return {
    openai: {
      available: Boolean(process.env.OPENAI_API_KEY),
      keyStart: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) : null
    },
    anthropic: {
      available: Boolean(process.env.ANTHROPIC_API_KEY),
      keyStart: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 7) : null
    },
    deepseek: {
      available: Boolean(process.env.DEEPSEEK_API_KEY),
      keyStart: process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.substring(0, 7) : null
    }
  };
}

/**
 * Check if an API key is available for a specific model
 * @param model The model name to check ('openai', 'anthropic'/'claude', 'deepseek', or 'moa')
 * @returns Boolean indicating whether the key is available
 */
export function isApiKeyAvailable(model: string): boolean {
  // Normalize model name
  const normalizedModel = model.toLowerCase();
  
  if (normalizedModel === 'moa') {
    // MOA requires all three models to be available
    return Boolean(
      process.env.OPENAI_API_KEY &&
      process.env.ANTHROPIC_API_KEY &&
      process.env.DEEPSEEK_API_KEY
    );
  } else if (normalizedModel === 'openai') {
    return Boolean(process.env.OPENAI_API_KEY);
  } else if (normalizedModel === 'anthropic' || normalizedModel === 'claude') {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  } else if (normalizedModel === 'deepseek') {
    return Boolean(process.env.DEEPSEEK_API_KEY);
  }
  
  return false;
}

/**
 * Get the key status for all supported models
 * @returns Object with status for each model
 */
export function getModelAvailability() {
  const keyStatus = validateApiKeys();
  
  return {
    openai: keyStatus.openai.available,
    anthropic: keyStatus.anthropic.available,
    claude: keyStatus.anthropic.available, // Alias for anthropic
    deepseek: keyStatus.deepseek.available,
    moa: keyStatus.openai.available && keyStatus.anthropic.available && keyStatus.deepseek.available
  };
}

/**
 * Generate a user-friendly message about missing API keys
 * @param model The model that was attempted to use
 * @returns A user-friendly error message
 */
export function getMissingApiKeyMessage(model: string): string {
  const normalizedModel = model.toLowerCase();
  
  if (normalizedModel === 'moa') {
    const keys = validateApiKeys();
    const missingKeys = [];
    
    if (!keys.openai.available) missingKeys.push('OpenAI');
    if (!keys.anthropic.available) missingKeys.push('Anthropic');
    if (!keys.deepseek.available) missingKeys.push('Deepseek');
    
    if (missingKeys.length === 0) return "All required API keys are available";
    
    return `MOA response generation requires all three API keys, but the following are missing: ${missingKeys.join(', ')}. Please add these API keys to your environment variables.`;
  } else if (normalizedModel === 'openai') {
    return 'OpenAI API key (OPENAI_API_KEY) is missing. Please add it to your environment variables.';
  } else if (normalizedModel === 'anthropic' || normalizedModel === 'claude') {
    return 'Anthropic API key (ANTHROPIC_API_KEY) is missing. Please add it to your environment variables.';
  } else if (normalizedModel === 'deepseek') {
    return 'Deepseek API key (DEEPSEEK_API_KEY) is missing. Please add it to your environment variables.';
  }
  
  return `API key for model "${model}" is missing. Please check your environment variables.`;
}