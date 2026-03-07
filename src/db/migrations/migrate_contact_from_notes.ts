/**
 * Migration Script — Étape 1
 * Migre les infos de contact du champ `notes` (tag JSON sérialisé)
 * vers les nouvelles colonnes dédiées `contact_name`, `contact_phone`, `contact_email`.
 *
 * Usage: npx tsx src/db/migrations/migrate_contact_from_notes.ts
 */

import { db } from '@/db';
import { suppliers } from '@/db/schema/suppliers.schema';
import { like, eq } from 'drizzle-orm';

export async function migrateContactsFromNotes() {
  console.log('🚀 Démarrage migration contacts (notes JSON → colonnes)...');

  // 1. Lire TOUTES les lignes contenant le tag JSON (opération admin globale, sans filtre user_id)
  const rows = await db.select()
    .from(suppliers)
    .where(like(suppliers.notes, '%[CONTACT_DATA_JSON:%'));

  console.log(`📋 ${rows.length} fournisseurs avec données de contact sérialisées trouvés`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      // 2. Extraire le JSON du tag
      const match = row.notes?.match(/\[CONTACT_DATA_JSON:([\s\S]*?)\]/);
      if (!match?.[1]) {
        skipped++;
        continue;
      }

      const contact = JSON.parse(match[1]);

      // 3. Écrire dans les nouvelles colonnes
      await db.update(suppliers)
        .set({
          contactName:  contact.nom   ?? null,
          contactPhone: contact.tel   ?? null,
          contactEmail: contact.email ?? null,
        })
        .where(eq(suppliers.id, row.id));

      migrated++;
    } catch (e) {
      console.error(`❌ [MIGRATION ERROR] supplier id=${row.id}:`, e);
      errors++;
    }
  }

  // 4. Validation post-migration
  const remaining = await db.select({ id: suppliers.id, notes: suppliers.notes })
    .from(suppliers)
    .where(like(suppliers.notes, '%[CONTACT_DATA_JSON:%'));

  console.log(`\n✅ Migration terminée :`);
  console.log(`   • Migrés   : ${migrated}`);
  console.log(`   • Ignorés  : ${skipped}`);
  console.log(`   • Erreurs  : ${errors}`);
  console.log(`   • Restants : ${remaining.length}`);

  if (remaining.length > 0) {
    console.error('❌ Migration incomplète. IDs non migrés :', remaining.map(r => r.id));
    throw new Error(
      `Migration incomplète : ${remaining.length} lignes non migrées. Rollback recommandé.`
    );
  }

  console.log('🎉 Migration contacts validée avec succès !');
}

// Exécution directe si lancé via CLI
if (require.main === module) {
  migrateContactsFromNotes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
