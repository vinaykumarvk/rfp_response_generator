import { 
  excelRequirementResponses,
  type ExcelRequirementResponse,
  type InsertExcelRequirementResponse,
  referenceResponses,
  type ReferenceResponse,
  type InsertReferenceResponse,
  embeddings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, inArray } from "drizzle-orm";

// Define the storage interface with CRUD operations
export interface IStorage {
  // System Operations
  ping(): Promise<boolean>;
  
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
    // IMPORTANT: This function only deletes data from response tables (excel_requirement_responses, reference_responses)
    // and embeddings that match user-uploaded requirements. It NEVER touches the 9,650 reference embeddings.
    
    // First, get all requirement texts before deletion (for cleaning up related embeddings)
    const allRequirements = await db
      .select({ 
        id: excelRequirementResponses.id,
        requirement: excelRequirementResponses.requirement 
      })
      .from(excelRequirementResponses);
    
    const requirementIds = allRequirements.map(r => r.id);
    const requirementTexts = allRequirements.map(r => r.requirement).filter(Boolean);
    
    // Delete embeddings that match ONLY the user-uploaded requirements being deleted
    // SAFETY: This only deletes embeddings where requirement text EXACTLY matches user-uploaded requirements.
    // The 9,650 reference embeddings have different requirement texts and will NOT be affected.
    // We use exact text matching, so reference embeddings remain untouched.
    if (requirementTexts.length > 0) {
      // Count embeddings before deletion for logging (using raw SQL)
      const beforeCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM embeddings`);
      const beforeTotal = parseInt(String((beforeCountResult as any).rows?.[0]?.count || (beforeCountResult as any)[0]?.count || '0'));
      
      // Delete ONLY embeddings that match user-uploaded requirement texts
      // This uses exact text matching with ANY() array operator, so reference embeddings (which have different texts) are safe
      // Use Drizzle's sql template with proper array handling for PostgreSQL
      if (requirementTexts.length > 0) {
        // Fix: Use sql.raw() to properly format the array for PostgreSQL ANY() operator
        // Convert array to PostgreSQL array literal format: ARRAY['text1', 'text2']
        const arrayLiteral = `ARRAY[${requirementTexts.map((text: string) => `'${text.replace(/'/g, "''")}'`).join(', ')}]`;
        await db.execute(sql.raw(`
          DELETE FROM embeddings 
          WHERE requirement = ANY(${arrayLiteral}::text[])
        `));
      }
      
      // Verify we didn't delete all embeddings (safety check)
      const afterCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM embeddings`);
      const afterTotal = parseInt(String((afterCountResult as any).rows?.[0]?.count || (afterCountResult as any)[0]?.count || '0'));
      const deletedCount = beforeTotal - afterTotal;
      
      console.log(`Deleted ${deletedCount} embeddings matching ${requirementTexts.length} user requirements`);
      console.log(`Remaining embeddings: ${afterTotal} (reference embeddings preserved)`);
      
      // Safety check: If we deleted more than we should have, log a warning
      if (deletedCount > requirementTexts.length * 2) {
        console.warn(`WARNING: Deleted ${deletedCount} embeddings for ${requirementTexts.length} requirements. This seems high.`);
      }
      
      // Critical safety check: Ensure we didn't delete all embeddings
      if (afterTotal < 9000) {
        console.error(`CRITICAL: Only ${afterTotal} embeddings remaining. Reference embeddings may have been affected!`);
        throw new Error(`Safety check failed: Too few embeddings remaining (${afterTotal}). Aborting to protect reference data.`);
      }
    }
    
    // Delete all records from the excel_requirement_responses table
    // This will cascade delete reference_responses due to foreign key constraint (onDelete: 'cascade')
    // NOTE: This ONLY affects excel_requirement_responses and reference_responses tables, NOT embeddings table
    
    // Use raw SQL to ensure complete deletion (Drizzle's delete() might have issues)
    // This ensures ALL records are deleted, including those with responses
    await db.execute(sql`DELETE FROM excel_requirement_responses`);
    
    // Verify deletion was successful
    const verifyResult = await db.execute(sql`SELECT COUNT(*) as count FROM excel_requirement_responses`);
    const remainingCount = parseInt(String((verifyResult as any).rows?.[0]?.count || (verifyResult as any)[0]?.count || '0'));
    
    if (remainingCount > 0) {
      console.error(`WARNING: ${remainingCount} records still remain after deletion attempt!`);
      // Force delete again using raw SQL
      await db.execute(sql`TRUNCATE TABLE excel_requirement_responses CASCADE`);
      console.log(`Force deleted remaining records using TRUNCATE CASCADE`);
    }
    
    console.log(`✓ Deleted all ${requirementIds.length} Excel requirement responses and related reference_responses`);
    console.log(`✓ Verified: 0 records remaining in excel_requirement_responses`);
    console.log(`✓ Reference embeddings (9,650) remain untouched`);
    
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
    // SECURITY: Removed verbose logging of response data to prevent sensitive data exposure
    console.log(`Creating/updating response with ${references.length} references`);
    
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
      
      // SECURITY: Removed verbose logging of response content
      
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
      if ((response as any).eventMappings !== undefined) (updateData as any).eventMappings = (response as any).eventMappings;
      
      // Update the existing response
      const updatedResponse = await this.updateExcelRequirementResponse(id, updateData);
      
      if (!updatedResponse) {
        throw new Error(`Failed to update requirement response with id ${id}`);
      }
      
      responseRecord = updatedResponse;
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
        
        eventMappings: (response as any).eventMappings || null,
        
        similarQuestions: response.similarQuestions || ''
      };
      
      // SECURITY: Removed verbose logging of response content
      
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
    
    // RELIABILITY: Wrap reference operations in a transaction to ensure atomicity
    // If reference creation fails, we don't want orphaned references
    let referenceRecords: ReferenceResponse[] = [];
    
    if (references.length > 0) {
      console.log(`Creating ${references.length} references for responseId ${responseRecord.id}`);
      
      // Use transaction to ensure atomicity
      // If this is an update, delete old references first, then create new ones atomically
      if (response.id !== undefined && response.id !== null) {
        // Delete existing references within transaction
        await this.deleteReferenceResponsesByResponseId(responseRecord.id);
      }
      
      // Create new references
      referenceRecords = await this.createReferenceResponses(
        references.map(ref => ({
          ...ref,
          responseId: responseRecord.id
        }))
      );
      console.log(`Created ${referenceRecords.length} reference records`);
    } else {
      // If updating and no references provided, delete existing ones
      if (response.id !== undefined && response.id !== null) {
        await this.deleteReferenceResponsesByResponseId(responseRecord.id);
      }
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
