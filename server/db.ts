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

// Add retry logic for the connection
async function createPool(retries = 3, delay = 1000): Promise<Pool> {
  for (let i = 0; i < retries; i++) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      // Test the connection
      await pool.connect();
      return pool;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to establish database connection after retries');
}

// Export a function to initialize the database connection
export async function initializeDatabase() {
  try {
    const pool = await createPool();
    console.log('Database connection established successfully');
    return drizzle({ client: pool, schema });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Initialize pool and db with retries
export const db = await initializeDatabase();