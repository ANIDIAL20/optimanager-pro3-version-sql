
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  const supplierId = process.argv[2];
  if (!supplierId) {
    console.error('Please provide a supplier ID');
    process.exit(1);
  }

  console.log(`🔍 Inspecting supplier ${supplierId}...`);

  try {
    const result = await db.execute(sql`SELECT id, name, notes FROM suppliers WHERE id::text = ${supplierId}`);
    const supplier = result.rows[0];

    if (!supplier) {
      console.error('❌ Supplier not found');
      return;
    }

    console.log('--- DB Record ---');
    console.log('ID:', supplier.id);
    console.log('Name:', supplier.name);
    console.log('Notes Raw:', supplier.notes);
    
    // Test parsing logic
    const notes = (supplier.notes as string) || '';
    const match = notes.match(/\[CONTACT_DATA_JSON:(.*?)\]/);
    
    console.log('--- Parsing Test ---');
    if (match && match[1]) {
        console.log('✅ Match found!');
        try {
            const parsed = JSON.parse(match[1]);
            console.log('Parsed JSON:', parsed);
        } catch (e) {
            console.error('❌ JSON Parse Error:', e);
        }
    } else {
        console.log('❌ No CONTACT_DATA_JSON found in notes.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
