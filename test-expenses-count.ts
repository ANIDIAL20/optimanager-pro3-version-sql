import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        const result = await db.execute(sql`SELECT COUNT(*) FROM expenses`);
        console.log("Count in expenses table:", result.rows[0].count);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
