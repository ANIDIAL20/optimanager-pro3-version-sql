import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as ws from 'ws';

neonConfig.webSocketConstructor = (ws as any).default || ws;
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
        res.rows.forEach(r => console.log(r.table_name));
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
