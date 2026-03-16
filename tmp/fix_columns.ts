
import * as dotenv from 'dotenv';
import * as ws from 'ws';

neonConfig.webSocketConstructor = (ws as any).default || ws;
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        console.log("🛠️  Fixing supplier_order_items.product_id type...");
        await pool.query('ALTER TABLE "supplier_order_items" ALTER COLUMN "product_id" TYPE integer USING (CASE WHEN "product_id"::text ~ \'^[0-9]+$\' THEN "product_id"::text::integer ELSE NULL END);');
        
        console.log("🛠️  Adding new accounting columns to supplier_orders if missing...");
        await pool.query('ALTER TABLE "supplier_orders" ADD COLUMN IF NOT EXISTS "amount_paid" numeric(15,2) DEFAULT \'0\';');
        await pool.query('ALTER TABLE "supplier_orders" ADD COLUMN IF NOT EXISTS "remaining_amount" numeric(15,2) DEFAULT \'0\';');
        await pool.query('ALTER TABLE "supplier_orders" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT \'unpaid\';');

        console.log("🛠️  Cleaning up legacy columns if they exist...");
        await pool.query('ALTER TABLE "supplier_orders" DROP COLUMN IF EXISTS "montant_paye";');
        await pool.query('ALTER TABLE "supplier_orders" DROP COLUMN IF EXISTS "reste_a_payer";');

        console.log("✅ Manual fixes applied.");
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
