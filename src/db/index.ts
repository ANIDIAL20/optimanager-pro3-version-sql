import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };

// Client-side guard: do not evaluate database in browser
const isBrowser = typeof window !== 'undefined';

// Essential for Transactions support in Node.js environment, but crashes Edge if imported statically
if (!isBrowser) {
  if (typeof WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = WebSocket;
  } else if (typeof process !== 'undefined' && process.release?.name === 'node') {
    try {
      // Use eval('require') to prevent bundlers from capturing 'ws' in client chunks
      neonConfig.webSocketConstructor = eval('require')('ws');
    } catch (e) {
      console.error('❌ [DB] Failed to load "ws" module for Neon WebSocket support:', e);
    }
  }
}


function trySetIpv4First() {
  if (isBrowser) return;

  try {
    const dns = eval('require')('dns') as {
      setDefaultResultOrder?: (order: 'ipv4first' | 'verbatim') => void;
    };
    dns.setDefaultResultOrder?.('ipv4first');
  } catch {
    // Some runtimes/bundlers do not expose native dns modules here.
  }
}

if (!isBrowser) {
  // Defensive default in case NODE_OPTIONS is not set in runtime.
  trySetIpv4First();
}

if (!isBrowser && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
  }
  return url;
}

const globalForDb = globalThis as unknown as { pool: Pool; db: any };

const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL!,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export const db = globalForDb.db ?? drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development',
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}
