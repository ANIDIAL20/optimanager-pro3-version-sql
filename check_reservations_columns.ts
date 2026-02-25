
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkColumns() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    console.log('Checking columns for frame_reservations...');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'frame_reservations'
    `;
    console.log('Columns in frame_reservations:', columns);
  } catch (err) {
    console.error('Error checking columns:', err);
  }
}

checkColumns();
