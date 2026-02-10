import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
}

// Singleton cache implementation for Next.js hot-reloading
declare global {
  var __db: any;
}

function createDbConnection() {
  const sql = neon(process.env.DATABASE_URL!, {
    fullResults: false,
  });

  return drizzle(sql, {
    schema,
    logger: process.env.NODE_ENV === 'development' && false, // Keep false to reduce noise unless debugging
  });
}

// ✅ Use global cache in development, fresh instance in production
const globalForDb = globalThis as unknown as { __db: any };

export const db =
  process.env.NODE_ENV === 'production'
    ? createDbConnection()
    : (globalForDb.__db = globalForDb.__db ?? createDbConnection());

// Neon HTTP adapter doesn't require manual connection closing for serverless
