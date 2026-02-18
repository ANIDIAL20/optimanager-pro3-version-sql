import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');

  try {
    const res = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    res.rows.forEach(r => console.log(r.table_name));
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

run().then(() => process.exit(0));
