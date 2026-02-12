
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://neondb_owner:npg_h0IRrY6tqysw@ep-patient-block-agvn05j2-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const client = await pool.connect();
    
    try {
        console.log("🔍 Checking duplicates...");
        const res = await client.query(`
            SELECT user_id, reference, count(*) 
            FROM products 
            WHERE reference IS NOT NULL 
            GROUP BY user_id, reference 
            HAVING count(*) > 1
        `);
        
        console.log(`Found ${res.rows.length} duplicate sets.`);
        
        for (const row of res.rows) {
            console.log(`Cleaning ${row.reference} for ${row.user_id}...`);
            const items = await client.query(
                'SELECT id FROM products WHERE user_id = $1 AND reference = $2 ORDER BY created_at ASC',
                [row.user_id, row.reference]
            );
            
            const idsToDelete = items.rows.slice(1).map(r => r.id);
            if (idsToDelete.length > 0) {
                console.log(`Deleting IDs: ${idsToDelete.join(', ')}`);
                await client.query('DELETE FROM products WHERE id = ANY($1)', [idsToDelete]);
            }
        }
        
        console.log("✅ DONE");
    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
