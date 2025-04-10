import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { addModelTestEndpoint } from "./routes_model_test";
import { addSimpleTestEndpoint } from "./routes_simple_test";

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
