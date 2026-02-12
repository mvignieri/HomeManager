import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Create Neon serverless connection (optimized for Vercel)
// Uses HTTP for better serverless compatibility
const sql = neon(process.env.DATABASE_URL);

// Create drizzle instance
export const db = drizzle(sql, { schema });
