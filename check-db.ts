import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log("DB URL Present:", !!process.env.DATABASE_URL);
import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function checkTable() {
    try {
        console.log("Checking frame_reservations table...");
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'frame_reservations'
        `);
        console.log("Columns found:", result.rows);
        if (result.rows.length === 0) {
            console.log("Table 'frame_reservations' does not exist!");
        }
    } catch (error) {
        console.error("Error checking table:", error);
    }
}

checkTable();
