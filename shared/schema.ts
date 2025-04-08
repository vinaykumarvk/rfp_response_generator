import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const rfpResponses = pgTable("rfp_responses", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientIndustry: text("client_industry").notNull(),
  rfpTitle: text("rfp_title").notNull(),
  rfpId: text("rfp_id"),
  submissionDate: date("submission_date").notNull(),
  budgetRange: text("budget_range"),
  projectSummary: text("project_summary").notNull(),
  companyName: text("company_name").notNull(),
  pointOfContact: text("point_of_contact").notNull(),
  companyStrengths: text("company_strengths"),
  selectedTemplate: text("selected_template").notNull(),
  customizations: text("customizations"),
  generatedContent: text("generated_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const excelRequirementResponses = pgTable("excel_requirement_responses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  requirement: text("requirement").notNull(),
  finalResponse: text("final_response"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rating: integer("rating"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRfpResponseSchema = createInsertSchema(rfpResponses).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertExcelRequirementResponseSchema = createInsertSchema(excelRequirementResponses).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRfpResponse = z.infer<typeof insertRfpResponseSchema>;
export type RfpResponse = typeof rfpResponses.$inferSelect;

export type InsertExcelRequirementResponse = z.infer<typeof insertExcelRequirementResponseSchema>;
export type ExcelRequirementResponse = typeof excelRequirementResponses.$inferSelect;

// Template types for frontend
export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  suitableFor: z.array(z.string()),
  structure: z.array(z.string()),
});

export type Template = z.infer<typeof templateSchema>;
