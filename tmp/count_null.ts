import { db } from '@/db';
import { products } from '@/db/schema';
import { isNull } from 'drizzle-orm';

async function main() {
  try {
    const results = await db.select({ id: products.id }).from(products).where(isNull(products.prixVente));
    console.log(`COUNT_START:${results.length}:COUNT_END`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
