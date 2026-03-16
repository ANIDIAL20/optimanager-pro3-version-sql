
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text');
    console.log('OK: image_url added to products');
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await pool.end();
  }
}

migrate();
