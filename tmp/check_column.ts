
import * as dotenv from 'dotenv';
import * as ws from 'ws';

neonConfig.webSocketConstructor = (ws as any).default || ws;
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const res = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'supplier_order_items' AND column_name = 'product_id';");
        console.log("Column type:", res.rows[0]?.data_type);
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
