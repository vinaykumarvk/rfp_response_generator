import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { addModelTestEndpoint } from "./routes_model_test";
import { addSimpleTestEndpoint } from "./routes_simple_test";

// Enhanced API keys and environment configuration check
console.log("=== COMPREHENSIVE ENVIRONMENT DIAGNOSTICS ===");
console.log("API Keys:");
console.log("- OpenAI API Key available:", process.env.OPENAI_API_KEY ? "Yes (starts with " + process.env.OPENAI_API_KEY.substring(0, 5) + "...)" : "No");
console.log("- Anthropic API Key available:", process.env.ANTHROPIC_API_KEY ? "Yes (starts with " + process.env.ANTHROPIC_API_KEY.substring(0, 5) + "...)" : "No");
console.log("- DeepSeek API Key available:", process.env.DEEPSEEK_API_KEY ? "Yes (starts with " + (process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.substring(0, 5) : "") + "...)" : "No");
console.log("- SendGrid API Key available:", process.env.SENDGRID_API_KEY ? "Yes" : "No");

console.log("\nDatabase Configuration:");
console.log("- DATABASE_URL available:", process.env.DATABASE_URL ? "Yes" : "No");
console.log("- Postgres env vars available:", 
  (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE && process.env.PGPASSWORD && process.env.PGPORT) 
    ? "All present" 
    : "Some missing");

console.log("\nRuntime Environment:");
console.log("- Current NODE_ENV:", process.env.NODE_ENV || "development");
console.log("- Runtime environment:", process.env.REPL_ID ? "Replit" : "Other");
console.log("- Node.js version:", process.version);
console.log("- Platform:", process.platform);
console.log("- Architecture:", process.arch);
console.log("- Current directory:", process.cwd());

// Log total environment variables count without revealing values
const envVarCategories = {
  API_KEYS: Object.keys(process.env).filter(key => key.includes('KEY') || key.includes('TOKEN')).length,
  DATABASE: Object.keys(process.env).filter(key => key.includes('DB') || key.includes('SQL') || key.startsWith('PG')).length,
  SYSTEM: Object.keys(process.env).filter(key => key.startsWith('NODE') || key.startsWith('PATH')).length,
  REPLIT: Object.keys(process.env).filter(key => key.includes('REPL')).length,
  OTHER: Object.keys(process.env).filter(key => 
    !key.includes('KEY') && !key.includes('TOKEN') && 
    !key.includes('DB') && !key.includes('SQL') && !key.startsWith('PG') &&
    !key.startsWith('NODE') && !key.startsWith('PATH') && 
    !key.includes('REPL')).length
};

console.log("\nEnvironment Variables Stats:");
console.log(`- Total: ${Object.keys(process.env).length} variables`);
console.log(`- By category: ${JSON.stringify(envVarCategories)}`);

// Current time for timestamp
console.log("\nServer startup time:", new Date().toISOString());
console.log("==================================================");

// Check for SendGrid API key
if (!process.env.SENDGRID_API_KEY) {
  console.log("SENDGRID_API_KEY is not set. Email functionality will not work.");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Add enhanced debugging for specific API endpoints
  if (path === '/api/generate-response') {
    console.log('==== DETAILED REQUEST DEBUG - /api/generate-response ====');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Capture and log the specific model response fields
    const originalEnd = res.end;
    res.end = function(chunk: any, ...args: any[]) {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && capturedJsonResponse) {
        console.log('==== DETAILED RESPONSE DEBUG - /api/generate-response ====');
        
        // Check for model-specific response fields
        const generatedResponse = capturedJsonResponse.generated_response || null;
        const openaiResponse = capturedJsonResponse.openai_response || null;
        const anthropicResponse = capturedJsonResponse.anthropic_response || null;
        const deepseekResponse = capturedJsonResponse.deepseek_response || null;
        
        console.log('Response fields:');
        console.log('- generated_response:', generatedResponse ? `Present (${generatedResponse.length} chars)` : 'Not present');
        console.log('- openai_response:', openaiResponse ? `Present (${openaiResponse.length} chars)` : 'Not present');
        console.log('- anthropic_response:', anthropicResponse ? `Present (${anthropicResponse.length} chars)` : 'Not present');
        console.log('- deepseek_response:', deepseekResponse ? `Present (${deepseekResponse.length} chars)` : 'Not present');
      }
      
      return originalEnd.apply(res, [chunk, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Add our test endpoints
  await addModelTestEndpoint(app);
  await addSimpleTestEndpoint(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
