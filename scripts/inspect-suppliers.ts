
import { db } from '@/db';
import { suppliers } from '@/db/schema';

async function main() {
  console.log('🔍 Inspecting Suppliers...');
  try {
    const allSuppliers = await db.select().from(suppliers);
    console.log(`✅ Found ${allSuppliers.length} suppliers.`);
    
    allSuppliers.forEach(s => {
      console.log(`- [${s.id}] ${s.name} (Cat: ${s.category}) | User: ${s.userId}`);
    });

  } catch (error) {
    console.error('❌ Error fetching suppliers:', error);
  }
}

main();
