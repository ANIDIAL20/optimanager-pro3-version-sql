
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Adding financial columns to frame_reservations...');
    
    // Add total_amount
    try {
      await client.query('ALTER TABLE frame_reservations ADD COLUMN total_amount DECIMAL(10, 2) DEFAULT 0');
      console.log('Column total_amount added');
    } catch (e) {
      if (e.code === '42701') console.log('Column total_amount already exists');
      else throw e;
    }

    // Add deposit_amount
    try {
      await client.query('ALTER TABLE frame_reservations ADD COLUMN deposit_amount DECIMAL(10, 2) DEFAULT 0');
      console.log('Column deposit_amount added');
    } catch (e) {
      if (e.code === '42701') console.log('Column deposit_amount already exists');
      else throw e;
    }

    // Add remaining_amount
    try {
      await client.query('ALTER TABLE frame_reservations ADD COLUMN remaining_amount DECIMAL(10, 2) DEFAULT 0');
      console.log('Column remaining_amount added');
    } catch (e) {
      if (e.code === '42701') console.log('Column remaining_amount already exists');
      else throw e;
    }

    console.log('Schema update completed successfully');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await client.end();
  }
}

fixSchema();
