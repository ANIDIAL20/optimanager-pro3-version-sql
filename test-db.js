const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function test() {
  try {
    const res = await db.execute(sql`SELECT * FROM information_schema.columns WHERE table_name = 'suppliers'`);
    console.log("Columns:", res.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
test();
