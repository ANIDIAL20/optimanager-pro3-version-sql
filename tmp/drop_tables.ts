import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as ws from 'ws';

neonConfig.webSocketConstructor = (ws as any).default || ws;
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        console.log("🔥 Dropping interim tables to allow clean migration...");
        await pool.query('DROP TABLE IF EXISTS "goods_receipt_items" CASCADE;');
        await pool.query('DROP TABLE IF EXISTS "goods_receipts" CASCADE;');
        await pool.query('DROP TABLE IF EXISTS "supplier_credits" CASCADE;');
        console.log("✅ Tables dropped.");
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
