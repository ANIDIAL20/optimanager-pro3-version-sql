const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function check() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not found in .env.local');
    return;
  }
  
  const sql = neon(url);
  try {
    const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
    console.log('Testing query for userId:', userId);
    const res = await sql`
      SELECT count(*) FROM "products" WHERE "user_id" = ${userId}
    `;
    console.log('Result:', res);
  } catch (e) {
    console.error('Query Failed:', e.message);
  }
 finally {
    process.exit();
  }
}

check();
