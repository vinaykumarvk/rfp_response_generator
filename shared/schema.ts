import { pgTable, text, serial, integer, boolean, date, timestamp, foreignKey, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Note: The following tables were removed as they're not being used:
// - users
// - rfp_responses
// - similar_questions
// - excel_requirements
// Reference to the original schema can be found in database_backups.

export const excelRequirementResponses = pgTable("excel_requirement_responses", {
  id: serial("id").primaryKey(),
  // New fields for RFP identification
  rfpName: text("rfp_name"),
  requirementId: text("requirement_id"),
  uploadedBy: text("uploaded_by"),
  
  // Existing fields
  category: text("category").notNull(),
  requirement: text("requirement").notNull(),
  
  // Elaborated requirement (user-edited version of the original question)
  elaboratedRequirement: text("elaborated_requirement"),
  
  // Response fields
  finalResponse: text("final_response"),
  openaiResponse: text("openai_response"),
  anthropicResponse: text("anthropic_response"),
  deepseekResponse: text("deepseek_response"),
  moaResponse: text("moa_response"),
  eventMappings: text("event_mappings"),
  
  // Similar questions (stored as JSON string)
  similarQuestions: text("similar_questions"),
  
  // Metadata
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rating: integer("rating"),
  feedback: text("feedback"),  // 'positive', 'negative', or null
  modelProvider: text("model_provider"),
});

// Table for storing reference information
export const referenceResponses = pgTable("reference_responses", {
  id: serial("id").primaryKey(),
  // Link to the parent response
  responseId: integer("response_id").notNull().references(() => excelRequirementResponses.id, { onDelete: 'cascade' }),
  // Reference information
  category: text("category").notNull(),
  requirement: text("requirement").notNull(),
  response: text("response").notNull(),
  reference: text("reference"),
  score: real("score").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations definition
export const excelRequirementResponsesRelations = relations(excelRequirementResponses, ({ many }) => ({
  references: many(referenceResponses),
}));

export const referenceResponsesRelations = relations(referenceResponses, ({ one }) => ({
  parentResponse: one(excelRequirementResponses, {
    fields: [referenceResponses.responseId],
    references: [excelRequirementResponses.id],
  }),
}));

// Insert schemas
export const insertExcelRequirementResponseSchema = createInsertSchema(excelRequirementResponses).omit({
  id: true,
  timestamp: true,
});

export const insertReferenceResponseSchema = createInsertSchema(referenceResponses).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertExcelRequirementResponse = z.infer<typeof insertExcelRequirementResponseSchema>;
export type ExcelRequirementResponse = typeof excelRequirementResponses.$inferSelect;

export type InsertReferenceResponse = z.infer<typeof insertReferenceResponseSchema>;
export type ReferenceResponse = typeof referenceResponses.$inferSelect;

// Template types for frontend
export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  suitableFor: z.array(z.string()),
  structure: z.array(z.string()),
});

export type Template = z.infer<typeof templateSchema>;

// Embeddings table schema - We'll create this using raw SQL since we need pgvector
export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  // Metadata fields
  category: text("category").notNull(),
  requirement: text("requirement").notNull(), 
  response: text("response").notNull(),
  reference: text("reference"),
  // Store other payload data as JSON
  payload: text("payload").notNull(), // JSON string of additional data
  // Note: The vector field will be created using raw SQL, we just define it here for type-safety
  // but exclude it from the create table operation
  // Timestamp for when this embedding was created
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schema for embeddings
export const insertEmbeddingSchema = createInsertSchema(embeddings).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertEmbedding = z.infer<typeof insertEmbeddingSchema> & { embedding: number[] };
export type Embedding = typeof embeddings.$inferSelect & { embedding: number[] };
