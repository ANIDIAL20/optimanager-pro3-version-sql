import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import * as dotenv from 'dotenv'; // This might not be needed in Next.js runtime but kept for scripts

// ✅ Hna kan-ferdo 3lih y9ra .env.local 9bel ay 7aja
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
}

// Configurer WebSocket pour l'environnement Node/Serverless
neonConfig.webSocketConstructor = ws;

// Singleton cache implementation for Next.js hot-reloading
const globalForDb = global as unknown as { db: any };

// If we already have a db instance in global (dev mode), use it
// Otherwise create a new one
let dbInstance;

if (process.env.NODE_ENV === 'production') {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzle(pool, { schema });
} else {
    if (!globalForDb.db) {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        globalForDb.db = drizzle(pool, { schema });
    }
    dbInstance = globalForDb.db;
}

export const db = dbInstance;
