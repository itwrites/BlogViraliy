// Referenced from javascript_database blueprint
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection with SSL for production
const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
let connectionString = process.env.DATABASE_URL;

// Ensure SSL is enabled for production connections
if (isProduction && !connectionString.includes('sslmode=')) {
  connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
}

export const pool = new Pool({ 
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined
});
export const db = drizzle({ client: pool, schema });
