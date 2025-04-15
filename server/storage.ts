import { 
  rfpResponses, 
  type RfpResponse, 
  type InsertRfpResponse, 
  users, 
  type User, 
  type InsertUser,
  excelRequirementResponses,
  type ExcelRequirementResponse,
  type InsertExcelRequirementResponse,
  referenceResponses,
  type ReferenceResponse,
  type InsertReferenceResponse
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// Define the storage interface with CRUD operations
export interface IStorage {
  // System Operations
  ping(): Promise<boolean>;

  // User Operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // RFP Response Operations
  getRfpResponse(id: number): Promise<RfpResponse | undefined>;
  getRfpResponses(): Promise<RfpResponse[]>;
  createRfpResponse(rfpResponse: InsertRfpResponse): Promise<RfpResponse>;
  updateRfpResponse(id: number, rfpResponse: Partial<InsertRfpResponse>): Promise<RfpResponse | undefined>;
  deleteRfpResponse(id: number): Promise<boolean>;
  
  // Excel Requirement Response Operations
  getExcelRequirementResponse(id: number): Promise<ExcelRequirementResponse | undefined>;
  getExcelRequirementResponseById(id: number): Promise<ExcelRequirementResponse | undefined>;
  getExcelRequirementResponses(): Promise<ExcelRequirementResponse[]>;
  createExcelRequirementResponse(response: InsertExcelRequirementResponse): Promise<ExcelRequirementResponse>;
  createExcelRequirementResponses(responses: InsertExcelRequirementResponse[]): Promise<ExcelRequirementResponse[]>;
  updateExcelRequirementResponse(id: number, response: Partial<InsertExcelRequirementResponse>): Promise<ExcelRequirementResponse | undefined>;
  updateSimilarQuestions(id: number, similarQuestions: any[]): Promise<ExcelRequirementResponse | undefined>;
  deleteExcelRequirementResponse(id: number): Promise<boolean>;
  deleteAllExcelRequirementResponses(): Promise<boolean>;

  // Reference Response Operations
  getReferenceResponses(responseId: number): Promise<ReferenceResponse[]>;
  createReferenceResponse(response: InsertReferenceResponse): Promise<ReferenceResponse>;
  createReferenceResponses(responses: InsertReferenceResponse[]): Promise<ReferenceResponse[]>;
  deleteReferenceResponsesByResponseId(responseId: number): Promise<boolean>;
  
  // Combined Operations
  createResponseWithReferences(
    response: InsertExcelRequirementResponse, 
    references: Omit<InsertReferenceResponse, 'responseId'>[]
  ): Promise<{
    response: ExcelRequirementResponse;
    references: ReferenceResponse[];
  }>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // System Operations
  async ping(): Promise<boolean> {
    // Simple query to check database connectivity
    await db.execute(sql`SELECT 1`);
    return true;
  }
  // User Operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // RFP Response Operations
  async getRfpResponse(id: number): Promise<RfpResponse | undefined> {
    const [rfpResponse] = await db.select().from(rfpResponses).where(eq(rfpResponses.id, id));
    return rfpResponse || undefined;
  }

  async getRfpResponses(): Promise<RfpResponse[]> {
    return await db.select().from(rfpResponses);
  }

  async createRfpResponse(insertRfpResponse: InsertRfpResponse): Promise<RfpResponse> {
    const now = new Date();
    const [rfpResponse] = await db
      .insert(rfpResponses)
      .values({
        ...insertRfpResponse,
        createdAt: now,
        lastUpdated: now
      })
      .returning();
    return rfpResponse;
  }

  async updateRfpResponse(id: number, rfpResponseUpdate: Partial<InsertRfpResponse>): Promise<RfpResponse | undefined> {
    const [updatedRfpResponse] = await db
      .update(rfpResponses)
      .set({
        ...rfpResponseUpdate,
        lastUpdated: new Date()
      })
      .where(eq(rfpResponses.id, id))
      .returning();
    
    return updatedRfpResponse || undefined;
  }

  async deleteRfpResponse(id: number): Promise<boolean> {
    const result = await db
      .delete(rfpResponses)
      .where(eq(rfpResponses.id, id));
    
    // In PostgreSQL, the count is not directly returned, but we can infer success if no error
    return true;
  }

  // Excel Requirement Response Operations
  async getExcelRequirementResponse(id: number): Promise<ExcelRequirementResponse | undefined> {
    const [response] = await db.select().from(excelRequirementResponses).where(eq(excelRequirementResponses.id, id));
    return response || undefined;
  }

  // Alias for getExcelRequirementResponse for backward compatibility
  async getExcelRequirementResponseById(id: number): Promise<ExcelRequirementResponse | undefined> {
    console.log(`Getting Excel requirement response by ID: ${id}`);
    return await this.getExcelRequirementResponse(id);
  }

  async getExcelRequirementResponses(): Promise<ExcelRequirementResponse[]> {
    return await db.select().from(excelRequirementResponses);
  }

  async createExcelRequirementResponse(response: InsertExcelRequirementResponse): Promise<ExcelRequirementResponse> {
    const [createdResponse] = await db
      .insert(excelRequirementResponses)
      .values(response)
      .returning();
    return createdResponse;
  }

  async createExcelRequirementResponses(responses: InsertExcelRequirementResponse[]): Promise<ExcelRequirementResponse[]> {
    if (responses.length === 0) {
      return [];
    }
    
    const createdResponses = await db
      .insert(excelRequirementResponses)
      .values(responses)
      .returning();
    return createdResponses;
  }

  async updateExcelRequirementResponse(id: number, response: Partial<InsertExcelRequirementResponse>): Promise<ExcelRequirementResponse | undefined> {
    const [updatedResponse] = await db
      .update(excelRequirementResponses)
      .set(response)
      .where(eq(excelRequirementResponses.id, id))
      .returning();
    
    return updatedResponse || undefined;
  }

  async deleteExcelRequirementResponse(id: number): Promise<boolean> {
    await db
      .delete(excelRequirementResponses)
      .where(eq(excelRequirementResponses.id, id));
    
    // In PostgreSQL, the count is not directly returned, but we can infer success if no error
    return true;
  }
  
  async deleteAllExcelRequirementResponses(): Promise<boolean> {
    // Delete all records from the table
    await db.delete(excelRequirementResponses);
    
    // In PostgreSQL, the count is not directly returned, but we can infer success if no error
    return true;
  }
  
  async updateSimilarQuestions(id: number, similarQuestions: any[]): Promise<ExcelRequirementResponse | undefined> {
    console.log(`Updating similar questions for requirement ID ${id}`);
    
    try {
      // Convert the similarQuestions array to JSON string
      const similarQuestionsJson = JSON.stringify(similarQuestions);
      
      // Update the response with the similar questions data
      const [updatedResponse] = await db
        .update(excelRequirementResponses)
        .set({
          similarQuestions: similarQuestionsJson
        })
        .where(eq(excelRequirementResponses.id, id))
        .returning();
      
      console.log(`Successfully updated similar questions for requirement ID ${id}`);
      return updatedResponse || undefined;
    } catch (error) {
      console.error(`Error updating similar questions for requirement ID ${id}:`, error);
      throw error;
    }
  }

  // Reference Response Operations
  async getReferenceResponses(responseId: number): Promise<ReferenceResponse[]> {
    return await db
      .select()
      .from(referenceResponses)
      .where(eq(referenceResponses.responseId, responseId));
  }

  async createReferenceResponse(response: InsertReferenceResponse): Promise<ReferenceResponse> {
    const [createdResponse] = await db
      .insert(referenceResponses)
      .values(response)
      .returning();
    return createdResponse;
  }

  async createReferenceResponses(responses: InsertReferenceResponse[]): Promise<ReferenceResponse[]> {
    if (responses.length === 0) {
      return [];
    }
    
    const createdResponses = await db
      .insert(referenceResponses)
      .values(responses)
      .returning();
    return createdResponses;
  }

  async deleteReferenceResponsesByResponseId(responseId: number): Promise<boolean> {
    await db
      .delete(referenceResponses)
      .where(eq(referenceResponses.responseId, responseId));
    
    // In PostgreSQL, the count is not directly returned, but we can infer success if no error
    return true;
  }

  // Combined Operations
  async createResponseWithReferences(
    response: InsertExcelRequirementResponse & { id?: number },
    references: Omit<InsertReferenceResponse, 'responseId'>[]
  ): Promise<{
    response: ExcelRequirementResponse;
    references: ReferenceResponse[];
  }> {
    console.log("Starting createResponseWithReferences...");
    console.log("Response to save:", JSON.stringify(response, null, 2));
    console.log("References count:", references.length);
    
    // DEBUG: Direct check of all model-specific fields in the incoming response
    console.log("DIRECT MODEL FIELD CHECK IN STORAGE:");
    console.log("- openaiResponse:", (response.openaiResponse !== undefined && response.openaiResponse !== null) ? 
                `Present (length: ${response.openaiResponse.length})` : "Not present");
    console.log("- anthropicResponse:", (response.anthropicResponse !== undefined && response.anthropicResponse !== null) ? 
                `Present (length: ${response.anthropicResponse.length})` : "Not present");
    console.log("- deepseekResponse:", (response.deepseekResponse !== undefined && response.deepseekResponse !== null) ?
                `Present (length: ${response.deepseekResponse.length})` : "Not present");
    console.log("- moaResponse:", (response.moaResponse !== undefined && response.moaResponse !== null) ?
                `Present (length: ${response.moaResponse.length})` : "Not present");
    
    // Also check for underscored name versions in case they're being provided differently
    console.log("- openai_response:", (response as any).openai_response ? `Present` : "Not present");
    console.log("- anthropic_response:", (response as any).anthropic_response ? `Present` : "Not present");
    console.log("- deepseek_response:", (response as any).deepseek_response ? `Present` : "Not present");
    console.log("- moa_response:", (response as any).moa_response ? `Present` : "Not present");
    
    let responseRecord: ExcelRequirementResponse;
    
    // Check if this is an update to an existing response (has an id)
    if (response.id !== undefined && response.id !== null) {
      const id = response.id;
      console.log(`Updating existing requirement response with id ${id}`);
      
      // Create update object with only valid fields
      const updateData: Partial<InsertExcelRequirementResponse> = {};
      
      // Ensure finalResponse is never empty
      if (response.finalResponse !== undefined && response.finalResponse !== null && response.finalResponse.trim() !== '') {
        updateData.finalResponse = response.finalResponse;
      } else {
        // If finalResponse is empty, create a default one based on the requirement
        updateData.finalResponse = `Response for requirement: "${response.requirement}"\n\nThis response addresses the specified requirement based on similar previous responses. Please review the reference responses for additional context and information.`;
        console.log("Created default finalResponse for empty value");
      }
      
      if (response.category !== undefined) updateData.category = response.category;
      if (response.modelProvider !== undefined) updateData.modelProvider = response.modelProvider;
      if (response.rating !== undefined) updateData.rating = response.rating;
      
      // Include model-specific responses
      console.log("MODEL RESPONSE DATA CHECK:");
      console.log("- openaiResponse:", response.openaiResponse ? `Present (Length: ${response.openaiResponse.length})` : "Not present or empty");
      console.log("- anthropicResponse:", response.anthropicResponse ? `Present (Length: ${response.anthropicResponse.length})` : "Not present or empty");
      console.log("- deepseekResponse:", response.deepseekResponse ? `Present (Length: ${response.deepseekResponse.length})` : "Not present or empty");
      console.log("- moaResponse:", response.moaResponse ? `Present (Length: ${response.moaResponse.length})` : "Not present or empty");
      
      // Always update all model-specific responses with whatever values came in
      // But check for empty strings which should be stored as null instead
      
      // IMPORTANT FIX: Don't save empty strings to database - use null instead
      updateData.openaiResponse = (response.openaiResponse !== undefined && response.openaiResponse !== null && response.openaiResponse !== '') 
        ? response.openaiResponse 
        : null;
      
      updateData.anthropicResponse = (response.anthropicResponse !== undefined && response.anthropicResponse !== null && response.anthropicResponse !== '') 
        ? response.anthropicResponse 
        : null;
      
      updateData.deepseekResponse = (response.deepseekResponse !== undefined && response.deepseekResponse !== null && response.deepseekResponse !== '')
        ? response.deepseekResponse 
        : null;
      
      updateData.moaResponse = (response.moaResponse !== undefined && response.moaResponse !== null && response.moaResponse !== '')
        ? response.moaResponse 
        : null;
      if (response.similarQuestions !== undefined) updateData.similarQuestions = response.similarQuestions;
      
      // Update the existing response
      const updatedResponse = await this.updateExcelRequirementResponse(id, updateData);
      
      if (!updatedResponse) {
        throw new Error(`Failed to update requirement response with id ${id}`);
      }
      
      responseRecord = updatedResponse;
      
      // Delete any existing references for this response
      console.log(`Deleting existing references for responseId ${responseRecord.id}`);
      await this.deleteReferenceResponsesByResponseId(responseRecord.id);
    } else {
      // Create a new response with only InsertExcelRequirementResponse fields
      const insertData: InsertExcelRequirementResponse = {
        requirement: response.requirement,
        category: response.category || '',
        finalResponse: response.finalResponse || '',
        modelProvider: response.modelProvider || null,
        rating: response.rating || null,
        
        // IMPORTANT FIX: Don't replace empty strings with null - this causes the fields to be saved
        // but with zero length. Instead, preserve null values but keep non-empty strings.
        openaiResponse: (response.openaiResponse !== undefined && response.openaiResponse !== null && response.openaiResponse !== '') 
          ? response.openaiResponse 
          : null,
        
        anthropicResponse: (response.anthropicResponse !== undefined && response.anthropicResponse !== null && response.anthropicResponse !== '') 
          ? response.anthropicResponse 
          : null,
        
        deepseekResponse: (response.deepseekResponse !== undefined && response.deepseekResponse !== null && response.deepseekResponse !== '') 
          ? response.deepseekResponse 
          : null,
        
        moaResponse: (response.moaResponse !== undefined && response.moaResponse !== null && response.moaResponse !== '') 
          ? response.moaResponse 
          : null,
        
        similarQuestions: response.similarQuestions || ''
      };
      
      // Log model-specific fields for debugging
      console.log("MODEL FIELDS IN NEW RECORD:");
      console.log("- finalResponse:", insertData.finalResponse ? `Present (${insertData.finalResponse.length} chars)` : "Not set");
      console.log("- openaiResponse:", insertData.openaiResponse ? `Present (${insertData.openaiResponse.length} chars)` : "Not set");
      console.log("- anthropicResponse:", insertData.anthropicResponse ? `Present (${insertData.anthropicResponse.length} chars)` : "Not set");
      console.log("- deepseekResponse:", insertData.deepseekResponse ? `Present (${insertData.deepseekResponse.length} chars)` : "Not set");
      console.log("- moaResponse:", insertData.moaResponse ? `Present (${insertData.moaResponse.length} chars)` : "Not set");
      
      // Ensure finalResponse is never empty for new records
      if (response.finalResponse !== undefined && response.finalResponse !== null && response.finalResponse.trim() !== '') {
        insertData.finalResponse = response.finalResponse;
      } else {
        // If finalResponse is empty, create a default one based on the requirement
        insertData.finalResponse = `Response for requirement: "${response.requirement}"\n\nThis response addresses the specified requirement based on similar previous responses. Please review the reference responses for additional context and information.`;
        console.log("Created default finalResponse for new response");
      }
      
      console.log("Creating new requirement response");
      responseRecord = await this.createExcelRequirementResponse(insertData);
    }
    
    // Then create all reference responses with the correct responseId
    let referenceRecords: ReferenceResponse[] = [];
    
    if (references.length > 0) {
      console.log(`Creating ${references.length} references for responseId ${responseRecord.id}`);
      referenceRecords = await this.createReferenceResponses(
        references.map(ref => ({
          ...ref,
          responseId: responseRecord.id
        }))
      );
      console.log(`Created ${referenceRecords.length} reference records`);
    } else {
      console.log("No references to create");
    }
    
    return {
      response: responseRecord,
      references: referenceRecords
    };
  }
}

// Export an instance of the database storage
export const storage = new DatabaseStorage();
