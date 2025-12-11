/**
 * Secure Python script runner that avoids shell injection vulnerabilities
 * Uses spawn() with proper argument arrays instead of exec() with shell strings
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

interface PythonResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Safely execute a Python script with arguments
 * @param scriptPath Path to Python script file
 * @param args Array of string arguments (will be properly escaped)
 * @param timeoutMs Timeout in milliseconds (default: 60000)
 */
export async function runPythonScript(
  scriptPath: string,
  args: string[] = [],
  timeoutMs: number = 60000
): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;

    // Set timeout
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Python script timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ stdout, stderr, code });
    });

    pythonProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Safely execute Python code inline with arguments passed as JSON
 * This avoids shell injection by using stdin instead of command-line arguments
 * @param pythonCode Python code to execute
 * @param args Object with arguments to pass (will be JSON encoded)
 * @param timeoutMs Timeout in milliseconds (default: 60000)
 */
export async function runPythonCode(
  pythonCode: string,
  args: Record<string, any> = {},
  timeoutMs: number = 60000
): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    // Wrap the code to accept JSON input from stdin
    const wrappedCode = `
import sys
import json
import traceback

try:
    # Read arguments from stdin as JSON
    input_data = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {}
    
    # Extract variables from input_data
    ${Object.keys(args).map(key => `${key} = input_data.get('${key}')`).join('\n    ')}
    
    # Execute user code
    ${pythonCode}
except Exception as e:
    error_details = {
        'error': str(e),
        'traceback': traceback.format_exc()
    }
    print(json.dumps(error_details))
    sys.exit(1)
`;

    const pythonProcess = spawn('python3', ['-c', wrappedCode], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;

    // Set timeout
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Python code execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ stdout, stderr, code });
    });

    pythonProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    // Write arguments as JSON to stdin
    pythonProcess.stdin.write(JSON.stringify(args));
    pythonProcess.stdin.end();
  });
}

/**
 * Validate and parse requirement ID to prevent injection
 */
export function validateRequirementId(id: unknown): number {
  if (typeof id === 'number' && Number.isInteger(id) && id > 0) {
    return id;
  }
  if (typeof id === 'string') {
    const parsed = parseInt(id, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed.toString() === id.trim()) {
      return parsed;
    }
  }
  throw new Error(`Invalid requirement ID: ${id}`);
}

/**
 * Validate model name to prevent injection
 */
export function validateModelName(model: unknown): string {
  const allowedModels = ['openai', 'openAI', 'anthropic', 'claude', 'deepseek', 'moa', 'ekg'];
  if (typeof model === 'string' && allowedModels.includes(model.toLowerCase())) {
    if (model.toLowerCase() === 'claude') return 'anthropic';
    return model.toLowerCase();
  }
  throw new Error(`Invalid model name: ${model}`);
}

/**
 * Validate boolean to prevent injection
 */
export function validateBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}
