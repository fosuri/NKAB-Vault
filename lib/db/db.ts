import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./auth-schema";

/**
 * Initializes the Postgres connection pool and Drizzle ORM singleton.
 */

const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

// 1. Establish a persistent connection pool with node-postgres
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL!,
  });

// 2. Prevent multiple pool instances during Next.js Hot Module Replacement (HMR)
if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

// 3. Register the relational schema for type-safe query building
export const db = drizzle({ client: pool, schema });