const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function fix() {
  console.log('🚀 Starting global schema fix...');
  
  const tables = {
    sales: [
      { name: 'transaction_number', type: 'TEXT' },
      { name: 'is_declared', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'is_official_invoice', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'comptabilite_status', type: "TEXT DEFAULT 'PENDING'" },
      { name: 'template_version_used', type: 'INTEGER' },
      { name: 'template_snapshot', type: 'JSONB' },
      { name: 'document_settings_snapshot', type: 'JSONB' },
      { name: 'type', type: "TEXT DEFAULT 'VENTE'" }
    ],
    clients: [
      { name: 'prenom', type: 'TEXT' },
      { name: 'nom', type: 'TEXT' },
      { name: 'phone_2', type: 'TEXT' },
      { name: 'gender', type: 'TEXT' },
      { name: 'cin', type: 'TEXT' },
      { name: 'date_of_birth', type: 'TIMESTAMP' },
      { name: 'credit_limit', type: "NUMERIC(10, 2) DEFAULT 5000" }
    ],
    sale_items: [
      { name: 'brand', type: 'TEXT' },
      { name: 'category', type: 'TEXT' },
      { name: 'product_type', type: 'TEXT' },
      { name: 'is_discount_line', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'metadata', type: 'JSON' }
    ]
  };

  for (const [tableName, columns] of Object.entries(tables)) {
    console.log(`\nTable: ${tableName}`);
    for (const col of columns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`));
        console.log(`✅ Column ${col.name} ok.`);
      } catch (err) {
        console.error(`❌ Error adding column ${col.name}:`, err.message);
      }
    }
  }

  console.log('\n🏁 Global schema fix completed.');
  process.exit(0);
}

fix().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
