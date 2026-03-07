import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
        console.log("Tables in public schema:");
        result.rows.forEach((r: any) => console.log(r.table_name));
    } catch (e) {
        console.error(e);
    }
}
main();
