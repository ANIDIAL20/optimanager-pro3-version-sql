import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// ✅ Hna kan-ferdo 3lih y9ra .env.local 9bel ay 7aja
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
}

// Configurer WebSocket pour l'environnement Node/Serverless
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
