import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Starting lenses migration...');
  
  try {
    const updateQuery = sql.raw(`
      UPDATE products 
      SET is_stock_managed = false
      WHERE 
        reference ILIKE 'VERRE%' 
        OR category ILIKE '%verre%' 
        OR product_type IN ('lens', 'verre', 'Verre', 'Lens');
    `);
    
    const result = await db.execute(updateQuery);
    console.log('✅ Migration successful!');
    
    // Check results
    const checkQuery = sql.raw(`SELECT count(*) FROM products WHERE is_stock_managed = false;`);
    const checkResult = await db.execute(checkQuery);
    console.log('Current count of products with is_stock_managed = false:', checkResult.rows[0].count);
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message || error);
  } finally {
    process.exit(0);
  }
}

main();
