import { rfpResponses, type RfpResponse, type InsertRfpResponse, users, type User, type InsertUser } from "@shared/schema";

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

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rfpResponses: Map<number, RfpResponse>;
  private userCurrentId: number;
  private rfpResponseCurrentId: number;

  constructor() {
    this.users = new Map();
    this.rfpResponses = new Map();
    this.userCurrentId = 1;
    this.rfpResponseCurrentId = 1;
  }

  // User Operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // RFP Response Operations
  async getRfpResponse(id: number): Promise<RfpResponse | undefined> {
    return this.rfpResponses.get(id);
  }

  async getRfpResponses(): Promise<RfpResponse[]> {
    return Array.from(this.rfpResponses.values());
  }

  async createRfpResponse(insertRfpResponse: InsertRfpResponse): Promise<RfpResponse> {
    const id = this.rfpResponseCurrentId++;
    const now = new Date();
    const rfpResponse: RfpResponse = { 
      ...insertRfpResponse, 
      id, 
      createdAt: now, 
      lastUpdated: now 
    };
    this.rfpResponses.set(id, rfpResponse);
    return rfpResponse;
  }

  async updateRfpResponse(id: number, rfpResponseUpdate: Partial<InsertRfpResponse>): Promise<RfpResponse | undefined> {
    const existingRfpResponse = this.rfpResponses.get(id);
    
    if (!existingRfpResponse) {
      return undefined;
    }
    
    const updatedRfpResponse: RfpResponse = {
      ...existingRfpResponse,
      ...rfpResponseUpdate,
      lastUpdated: new Date()
    };
    
    this.rfpResponses.set(id, updatedRfpResponse);
    return updatedRfpResponse;
  }

  async deleteRfpResponse(id: number): Promise<boolean> {
    return this.rfpResponses.delete(id);
  }
}

// Export an instance of the storage
export const storage = new MemStorage();
