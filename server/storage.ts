import { rfpResponses, type RfpResponse, type InsertRfpResponse, users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
}

// Export an instance of the database storage
export const storage = new DatabaseStorage();
