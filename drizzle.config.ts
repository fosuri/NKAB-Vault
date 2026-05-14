import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle ORM Configuration.
 * 
 * Defines the database schema locations, migration output directory, 
 * and connection credentials for Drizzle Kit operations.
 */
export default defineConfig({
  // Path to the database schema definitions (modular pattern)
  schema: "./lib/db/*-schema.ts",
  
  // Directory where auto-generated migration files are stored
  out: "./drizzle",
  
  // Database engine type
  dialect: "postgresql",
  
  // Database connection credentials from environment variables
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  }
})