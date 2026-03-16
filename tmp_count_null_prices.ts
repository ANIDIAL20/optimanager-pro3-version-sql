import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

import { db } from './src/db';
import { products } from './src/db/schema';
import { isNull } from 'drizzle-orm';

async function main() {
  try {
    const result = await db.select().from(products).where(isNull(products.prixVente));
    console.log(`Products with prixVente = null: ${result.length}`);
    const result2 = await db.select().from(products);
    console.log(`Total products: ${result2.length}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
