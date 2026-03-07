import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  console.log("Testing connection to:", process.env.DATABASE_URL?.split('@')[1]);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log("✅ Connection successful!");
    const res = await client.query('SELECT NOW()');
    console.log("Time:", res.rows[0]);
    await client.end();
  } catch (e: any) {
    console.error("❌ Connection failed:", e.message);
  }
}
run();
