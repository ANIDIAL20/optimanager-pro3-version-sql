import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };

// ✅ Essential for Transactions support in Node.js environment
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
}

// Singleton cache implementation for Next.js hot-reloading
declare global {
  var __db_v6: any;
}

function createDbConnection() {
  console.log("🔌 [DB] Creating new database connection pool (v6)...");
  // Use Pool instead of simple neon() for better transaction/session support
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  return drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development' && false,
  });
}

// ✅ Use global cache in development, fresh instance in production
const globalForDb = globalThis as unknown as { __db_v6: any };

export const db =
  process.env.NODE_ENV === 'production'
    ? createDbConnection()
    : (globalForDb.__db_v6 = globalForDb.__db_v6 ?? createDbConnection());
