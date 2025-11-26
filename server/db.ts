import * as schema from "@shared/schema";
import { Pool as PgPool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're using a local PostgreSQL or Neon database
const databaseUrl = process.env.DATABASE_URL;
const isLocalDatabase = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') || !databaseUrl.includes('neon.tech');

let db: ReturnType<typeof drizzlePg>;
let pool: PgPool | any;

if (isLocalDatabase) {
  // Use standard PostgreSQL driver for local databases
  pool = new PgPool({ connectionString: databaseUrl });
  db = drizzlePg({ client: pool, schema });
  
  console.log("Using standard PostgreSQL driver for local database");
} else {
  // Use Neon serverless driver for Neon cloud databases
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon({ client: pool, schema });
  
  console.log("Using Neon serverless driver for cloud database");
}

export { pool, db };
