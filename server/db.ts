import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// CUTOVER: standard node-postgres driver so we can connect to the old DB on
// Render (the Neon serverless/WebSocket driver only works against Neon).
// `pg` works with both Render and Neon. SSL is required by hosted Postgres
// (Render/Neon) but not for a local connection.
const url = process.env.DATABASE_URL;
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

export const pool = new Pool({
  connectionString: url,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });
