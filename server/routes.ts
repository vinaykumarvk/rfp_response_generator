import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRfpResponseSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix with /api
  const apiRouter = app.route('/api');
  
  // Get all RFP responses
  app.get("/api/rfp-responses", async (_req: Request, res: Response) => {
    try {
      const rfpResponses = await storage.getRfpResponses();
      return res.json(rfpResponses);
    } catch (error) {
      console.error("Error fetching RFP responses:", error);
      return res.status(500).json({ message: "Failed to fetch RFP responses" });
    }
  });

  // Get a specific RFP response by ID
  app.get("/api/rfp-responses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const rfpResponse = await storage.getRfpResponse(id);
      if (!rfpResponse) {
        return res.status(404).json({ message: "RFP response not found" });
      }

      return res.json(rfpResponse);
    } catch (error) {
      console.error("Error fetching RFP response:", error);
      return res.status(500).json({ message: "Failed to fetch RFP response" });
    }
  });

  // Create a new RFP response
  app.post("/api/rfp-responses", async (req: Request, res: Response) => {
    try {
      const result = insertRfpResponseSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const newRfpResponse = await storage.createRfpResponse(result.data);
      return res.status(201).json(newRfpResponse);
    } catch (error) {
      console.error("Error creating RFP response:", error);
      return res.status(500).json({ message: "Failed to create RFP response" });
    }
  });

  // Update an existing RFP response
  app.patch("/api/rfp-responses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Partially validate the update fields
      const result = insertRfpResponseSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }

      const updatedRfpResponse = await storage.updateRfpResponse(id, result.data);
      if (!updatedRfpResponse) {
        return res.status(404).json({ message: "RFP response not found" });
      }

      return res.json(updatedRfpResponse);
    } catch (error) {
      console.error("Error updating RFP response:", error);
      return res.status(500).json({ message: "Failed to update RFP response" });
    }
  });

  // Delete an RFP response
  app.delete("/api/rfp-responses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const deleted = await storage.deleteRfpResponse(id);
      if (!deleted) {
        return res.status(404).json({ message: "RFP response not found" });
      }

      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting RFP response:", error);
      return res.status(500).json({ message: "Failed to delete RFP response" });
    }
  });

  // Get templates
  app.get("/api/templates", (_req: Request, res: Response) => {
    // Predefined templates
    const templates = [
      {
        id: "standard",
        name: "Standard Business Proposal",
        description: "A comprehensive template suitable for most business RFPs with executive summary, company background, solution approach, pricing, and implementation timeline.",
        suitableFor: ["Technology", "Finance", "Retail", "Manufacturing"],
        structure: [
          "Executive Summary",
          "Company Background",
          "Understanding of Requirements",
          "Proposed Solution",
          "Implementation Approach",
          "Timeline",
          "Pricing",
          "Team Qualifications",
          "References",
          "Appendices"
        ]
      },
      {
        id: "technical",
        name: "Technical Solution Proposal",
        description: "Focused on technical specifications and implementation details, ideal for IT, software, and infrastructure projects.",
        suitableFor: ["Technology", "Healthcare", "Manufacturing"],
        structure: [
          "Executive Summary",
          "Technical Approach",
          "Architecture Overview",
          "Technology Stack",
          "Security Considerations",
          "Integration Points",
          "Implementation Methodology",
          "Testing Strategy",
          "Maintenance & Support",
          "Technical Team Profiles"
        ]
      },
      {
        id: "government",
        name: "Government/Public Sector Response",
        description: "Structured to meet the formal requirements of government RFPs, including compliance documentation and detailed cost breakdowns.",
        suitableFor: ["Government", "Education", "Healthcare"],
        structure: [
          "Cover Letter",
          "Executive Summary",
          "Statement of Compliance",
          "Technical Response",
          "Management Approach",
          "Past Performance",
          "Staffing Plan",
          "Quality Assurance",
          "Detailed Cost Proposal",
          "Required Forms & Certifications"
        ]
      }
    ];
    
    return res.json(templates);
  });

  // Handle Excel file upload for analysis
  app.post("/api/analyze-excel", async (req: Request, res: Response) => {
    try {
      // This is a placeholder endpoint for now
      // In the future, we'll implement file upload handling and processing with multer
      // The real implementation will call the Python script for analysis
      
      // For now, return a mock response
      setTimeout(() => {
        res.status(200).json({
          message: "Excel file analyzed successfully",
          analyzedRows: 25,
          matchedRows: 18
        });
      }, 1000);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      return res.status(500).json({ message: "Failed to process Excel file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
