/**
 * scripts/add-suppliers-contact-columns.ts
 * Adds contact_name, contact_phone, contact_email columns to suppliers table.
 * Run: npx tsx --env-file=.env.local scripts/add-suppliers-contact-columns.ts
 */
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('🔧 Adding missing contact columns to suppliers table...\n');

  const alterations = [
    { col: 'contact_name',  ddl: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name  TEXT`  },
    { col: 'contact_phone', ddl: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_phone TEXT`  },
    { col: 'contact_email', ddl: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_email TEXT`  },
  ];

  for (const { col, ddl } of alterations) {
    try {
      await db.execute(sql.raw(ddl));
      console.log(`  ✅ ${col} — added`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log(`  ⏭️  ${col} — already exists, skipped`);
      } else {
        console.error(`  ❌ ${col} — ERROR:`, e.message);
      }
    }
  }

  console.log('\n🎉 Done! The /suppliers page should now load correctly.');
  process.exit(0);
}

run();
