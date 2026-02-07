const { Pool } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const ws = require('ws');

// Configure environment
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migration: adding sale_id to lens_orders...');
    
    // Check if column exists first to avoid error
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='lens_orders' AND column_name='sale_id';
    `;
    const checkRes = await client.query(checkQuery);
    
    if (checkRes.rows.length === 0) {
      await client.query(`
        ALTER TABLE lens_orders 
        ADD COLUMN sale_id integer REFERENCES sales(id);
      `);
      console.log('✅ Column sale_id added successfully!');
    } else {
      console.log('ℹ️ Column sale_id already exists.');
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
