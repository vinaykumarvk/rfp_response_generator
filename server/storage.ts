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
import { eq, and } from "drizzle-orm";

// Define the storage interface with CRUD operations
export interface IStorage {
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
  getExcelRequirementResponses(): Promise<ExcelRequirementResponse[]>;
  createExcelRequirementResponse(response: InsertExcelRequirementResponse): Promise<ExcelRequirementResponse>;
  createExcelRequirementResponses(responses: InsertExcelRequirementResponse[]): Promise<ExcelRequirementResponse[]>;
  updateExcelRequirementResponse(id: number, response: Partial<InsertExcelRequirementResponse>): Promise<ExcelRequirementResponse | undefined>;
  deleteExcelRequirementResponse(id: number): Promise<boolean>;

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
    response: InsertExcelRequirementResponse,
    references: Omit<InsertReferenceResponse, 'responseId'>[]
  ): Promise<{
    response: ExcelRequirementResponse;
    references: ReferenceResponse[];
  }> {
    // First create the main response
    const createdResponse = await this.createExcelRequirementResponse(response);
    
    // Then create all reference responses with the correct responseId
    const referenceResponses = await this.createReferenceResponses(
      references.map(ref => ({
        ...ref,
        responseId: createdResponse.id
      }))
    );
    
    return {
      response: createdResponse,
      references: referenceResponses
    };
  }
}

// Export an instance of the database storage
export const storage = new DatabaseStorage();
