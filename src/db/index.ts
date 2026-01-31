import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// ✅ Hna kan-ferdo 3lih y9ra .env.local 9bel ay 7aja
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL mafih walou! T2akked anna .env.local fih lien d Neon.");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
