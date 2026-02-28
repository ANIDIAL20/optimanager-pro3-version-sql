import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as ws from 'ws';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };
// Schema re-evaluation trigger: v6.1 - Fixed supplier table name

// ✅ Essential for Transactions support in Node.js environment
neonConfig.webSocketConstructor = (ws as any).default || ws;

// ✅ Client-side guard: do not evaluate database in browser
const isBrowser = typeof window !== 'undefined';

if (!isBrowser && !process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
}

// Singleton cache implementation for Next.js hot-reloading
declare global {
  var __db_v6: any;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("❌ DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
  }
  return url;
}

function createDbConnection() {
  console.log("🔌 [DB] Creating new database connection pool (v6)...");
  // Use Pool instead of simple neon() for better transaction/session support
  const pool = new Pool({ 
    connectionString: getDatabaseUrl(),
  });

  return drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  });
}

// ✅ Use global cache in development, fresh instance in production
const globalForDb = globalThis as unknown as { __db_v6: any };

function getDbInstance() {
  if (isBrowser) return null as any;
  return process.env.NODE_ENV === 'production'
    ? (globalForDb.__db_v6 ??= createDbConnection())
    : (globalForDb.__db_v6 = globalForDb.__db_v6 ?? createDbConnection());
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      console.log(`📡 [DB Proxy] Accessing property: ${String(prop)}`);
      const instance = getDbInstance();
      if (!instance) {
        console.error("❌ [DB Proxy] No database instance available!");
        return undefined;
      }
      const value = (instance as any)[prop as any];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  }
) as ReturnType<typeof createDbConnection>;
