require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });

const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function debug() {
  try {
    console.log('--- Database Check ---');
    const tables = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('Tables:', (tables.rows || tables).map(r => r.table_name));

    const cols = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'`);
    console.log('Clients columns:', (cols.rows || cols).map(r => r.column_name));

    process.exit(0);
  } catch (e) {
    console.error('Debug failed:', e.message);
    process.exit(1);
  }
}

debug();
