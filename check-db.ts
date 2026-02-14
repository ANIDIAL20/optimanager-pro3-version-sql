import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
    try {
        const tables = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log('Tables in DB:', tables.rows);
        
        const frameCols = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'frame_reservations'`);
        console.log('Columns in frame_reservations:', frameCols.rows);
    } catch (err) {
        console.error('Error checking schema:', err);
    }
}

checkSchema();
