import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as ws from 'ws';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };

// Essential for Transactions support in Node.js environment
neonConfig.webSocketConstructor = (ws as any).default || ws;

// Client-side guard: do not evaluate database in browser
const isBrowser = typeof window !== 'undefined';

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

function createDbConnection() {
  console.log('[DB] Creating new database connection pool...');
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  });
}

// In PRODUCTION: use a singleton to avoid creating too many connections.
// In DEVELOPMENT: use a module-level (not globalThis) singleton so that
// Turbopack hot-reload always gets a fresh Pool instance, preventing
// stale prepared-statement errors after schema migrations.
declare global {
  var __db_prod: ReturnType<typeof createDbConnection> | undefined;
}

// Module-level dev instance - cleared on every Turbopack full-reload
let _devInstance: ReturnType<typeof createDbConnection> | null = null;

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      console.log(`[DB Proxy] Accessing property: ${String(prop)}`);

      if (isBrowser) {
        console.error('[DB Proxy] No database instance available!');
        return undefined;
      }

      let instance: ReturnType<typeof createDbConnection>;

      if (process.env.NODE_ENV === 'production') {
        // Production: stable singleton on globalThis
        if (!globalThis.__db_prod) {
          globalThis.__db_prod = createDbConnection();
        }
        instance = globalThis.__db_prod;
      } else {
        // Development: module-level singleton - fresh after each Turbopack reload
        if (!_devInstance) {
          _devInstance = createDbConnection();
        }
        instance = _devInstance;
      }

      const value = (instance as any)[prop as any];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  }
) as ReturnType<typeof createDbConnection>;
