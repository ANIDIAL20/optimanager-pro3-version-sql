
import * as dotenv from 'dotenv';
import * as ws from 'ws';

neonConfig.webSocketConstructor = (ws as any).default || ws;
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        console.log("🔥 Dropping interim indexes...");
        await pool.query('DROP INDEX IF EXISTS "idx_goods_receipts_supplier";');
        await pool.query('DROP INDEX IF EXISTS "idx_goods_receipt_items_receipt";');
        await pool.query('DROP INDEX IF EXISTS "idx_supplier_credits_supplier";');
        await pool.query('DROP INDEX IF EXISTS "idx_supplier_credits_status";');
        await pool.query('DROP INDEX IF EXISTS "idx_orders_supplier_date";');
        await pool.query('DROP INDEX IF EXISTS "idx_payments_supplier_date";');
        console.log("✅ Indexes dropped.");
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
