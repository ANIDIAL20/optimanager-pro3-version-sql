
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function cleanup() {
  console.log('🔍 Checking for duplicate products (user_id + reference)...');
  
  try {
    const duplicates = await db.execute(sql`
      SELECT user_id, reference, COUNT(*) 
      FROM products 
      WHERE reference IS NOT NULL
      GROUP BY user_id, reference 
      HAVING COUNT(*) > 1
    `);

    console.log(`Found ${duplicates.length} sets of duplicates.`);

    for (const dup of duplicates) {
      const { user_id, reference } = dup;
      console.log(`Processing ${reference} for user ${user_id}...`);
      
      const items = await db.execute(sql`
        SELECT id FROM products 
        WHERE user_id = ${user_id} AND reference = ${reference}
        ORDER BY created_at ASC
      `);

      const idsToDelete = items.slice(1).map(i => i.id);
      if (idsToDelete.length > 0) {
        console.log(`Deleting ${idsToDelete.length} duplicates: ${idsToDelete.join(', ')}`);
        await db.execute(sql`
          DELETE FROM products WHERE id IN (${sql.join(idsToDelete, sql`, `)})
        `);
      }
    }

    console.log('✅ Cleanup complete. You can now run db:push.');
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  }
}

cleanup();
