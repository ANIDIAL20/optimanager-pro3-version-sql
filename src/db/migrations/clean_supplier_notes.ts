/**
 * Migration Script — Clean Supplier Notes
 * Strips the [CONTACT_DATA_JSON:...] tag from supplier notes fields.
 *
 * The previous migration `migrate_contact_from_notes.ts` correctly extracted
 * contact data into dedicated columns (contact_name, contact_phone, contact_email).
 * However, it did NOT remove the serialized tag from the `notes` field.
 * This script completes that cleanup.
 *
 * Usage: npx tsx src/db/migrations/clean_supplier_notes.ts
 *
 * Prerequisites:
 *   - Run `migrate_contact_from_notes.ts` FIRST to ensure contact columns are populated.
 */

import { db } from '@/db';
import { suppliers } from '@/db/schema/suppliers.schema';
import { like, eq } from 'drizzle-orm';

const CONTACT_JSON_REGEX = /\[CONTACT_DATA_JSON:[\s\S]*?\]/g;

export async function cleanSupplierNotes() {
  console.log('🧹 Starting notes cleanup (stripping [CONTACT_DATA_JSON:...] tags)...');

  // 1. Find all suppliers that still have the JSON tag in notes
  const rows = await db.select({ id: suppliers.id, notes: suppliers.notes })
    .from(suppliers)
    .where(like(suppliers.notes, '%[CONTACT_DATA_JSON:%'));

  console.log(`📋 ${rows.length} supplier(s) found with stale JSON tags in notes`);

  if (rows.length === 0) {
    console.log('✅ Nothing to clean — all supplier notes are already clean!');
    return;
  }

  let cleaned = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const cleanedNotes = (row.notes || '').replace(CONTACT_JSON_REGEX, '').trim() || null;

      await db.update(suppliers)
        .set({ notes: cleanedNotes })
        .where(eq(suppliers.id, row.id));

      cleaned++;
    } catch (e) {
      console.error(`❌ [CLEANUP ERROR] supplier id=${row.id}:`, e);
      errors++;
    }
  }

  // 2. Validation: confirm no rows remain
  const remaining = await db.select({ id: suppliers.id })
    .from(suppliers)
    .where(like(suppliers.notes, '%[CONTACT_DATA_JSON:%'));

  console.log(`\n✅ Notes cleanup complete:`);
  console.log(`   • Cleaned : ${cleaned}`);
  console.log(`   • Errors  : ${errors}`);
  console.log(`   • Remaining: ${remaining.length}`);

  if (remaining.length > 0) {
    console.error('❌ Cleanup incomplete. Supplier IDs still affected:', remaining.map((r) => r.id));
    throw new Error(`Notes cleanup incomplete: ${remaining.length} row(s) still contain the JSON tag.`);
  }

  console.log('🎉 Supplier notes fully cleaned!');
}

// Run directly via CLI
if (require.main === module) {
  cleanSupplierNotes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
