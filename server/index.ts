// Load environment variables from .env file
import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// SECURITY: Removed API key prefix logging to prevent secrets exposure
// Only log presence/absence, not actual key values
console.log("=== ENVIRONMENT DIAGNOSTICS ===");
console.log("API Keys:");
console.log("- OpenAI API Key available:", process.env.OPENAI_API_KEY ? "Yes" : "No");
console.log("- Anthropic API Key available:", process.env.ANTHROPIC_API_KEY ? "Yes" : "No");
console.log("- DeepSeek API Key available:", process.env.DEEPSEEK_API_KEY ? "Yes" : "No");
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

  // SECURITY: Removed verbose logging of request/response bodies to prevent sensitive data exposure
  // Only log minimal metadata for debugging
  if (path === '/api/generate-response') {
    // Log only metadata, not actual content
    console.log(`[${req.method}] ${path} - requirementId: ${req.body?.requirementId || 'N/A'}, model: ${req.body?.model || 'N/A'}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // SECURITY: Don't log full response bodies - they may contain sensitive data
      // Only log status and metadata
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Enhanced error logging for deployment troubleshooting
    console.error('======= ERROR DETAILS =======');
    console.error(`Status: ${status}`);
    console.error(`Message: ${message}`);
    console.error(`Path: ${_req.path}`);
    console.error(`Stack: ${err.stack || 'No stack available'}`);
    console.error('============================');

    res.status(status).json({ 
      message,
      status,
      path: _req.path,
      timestamp: new Date().toISOString(),
      // Don't expose stack trace to client in production
      ...(app.get("env") === "development" ? { stack: err.stack } : {})
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable for GCP compatibility (Cloud Run, App Engine)
  // Default to 5000 for local development
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
