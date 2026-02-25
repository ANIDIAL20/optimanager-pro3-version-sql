
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkLensOrders() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'lens_orders'");
    console.log('Columns in lens_orders:', result.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkLensOrders();
