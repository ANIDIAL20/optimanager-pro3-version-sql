require('dotenv').config({path: '.env.local'});
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function run() {
  try {
    const res = await pool.query(`
      SELECT "id", "user_id", "name", "email", "phone", "address", "city", "ice", "category",
             "payment_terms", "payment_method", "default_tax_mode", "status", "created_at",
             "contact_name", "contact_phone", "contact_email", "current_balance", count(*) over()
      FROM "suppliers"
      WHERE ("suppliers"."user_id" = 'd7daf565-32ff-482d-b798-63120fd75e66'
        AND "suppliers"."category" ilike '%Verres%')
      ORDER BY "suppliers"."created_at" desc
      LIMIT 20
    `);
    console.log('SUCCESS, lines:', res.rows.length);
  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await pool.end();
  }
}
run();
