import 'dotenv/config';
import * as schema from '../shared/schema.js';

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

let db: any;

if (isProduction) {
  // Production: Use Neon serverless driver (HTTP-based for Vercel)
  const { drizzle: drizzleNeon } = await import('drizzle-orm/neon-http');
  const { neon } = await import('@neondatabase/serverless');

  const sql = neon(process.env.DATABASE_URL);
  db = drizzleNeon(sql, { schema });
  console.log('✓ Using Neon serverless driver (production)');
} else {
  // Development: Use standard postgres driver
  const { drizzle: drizzlePostgres } = await import('drizzle-orm/postgres-js');
  const postgres = (await import('postgres')).default;

  const queryClient = postgres(process.env.DATABASE_URL);
  db = drizzlePostgres(queryClient, { schema });
  console.log('✓ Using standard postgres driver (development)');
}

export { db };
