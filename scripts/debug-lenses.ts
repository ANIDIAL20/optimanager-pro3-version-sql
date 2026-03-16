import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔍 Checking lenses data in database...');
  
  try {
    const query = sql.raw(`
      SELECT category, product_type, is_stock_managed, count(*) 
      FROM products 
      WHERE reference ILIKE 'VERRE%' 
         OR category ILIKE '%verre%' 
         OR product_type IN ('lens', 'verre')
      GROUP BY category, product_type, is_stock_managed;
    `);
    
    const results = await db.execute(query);
    console.log('Results:');
    console.log(JSON.stringify(results.rows, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error executing query:', error.message || error);
    if (error.cause) console.error('Cause:', error.cause);
  } finally {
    process.exit(0);
  }
}

main();
