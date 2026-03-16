import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Adding marque_id to products...');
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS marque_id integer REFERENCES brands(id)`);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
