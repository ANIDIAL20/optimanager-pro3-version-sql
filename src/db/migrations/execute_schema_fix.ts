import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../index');
  const { sql } = await import('drizzle-orm');

  console.log('🚀 Démarrage de la mise à jour forcée du schéma (Neon DB)...');

  try {
    console.log('🔄 Application de la transformation: INT -> VARCHAR(36)');
    await db.execute(sql`
      ALTER TABLE "reminders" 
        ALTER COLUMN "related_id" TYPE varchar(36) 
        USING "related_id"::varchar(36);
    `);
    console.log('✅ related_id converti avec succès en VARCHAR(36)');

    console.log('🔄 Ajout de la colonne deleted_at...');
    await db.execute(sql`
      ALTER TABLE "reminders" 
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    `);
    console.log('✅ Colonne deleted_at ajoutée avec succès');

    console.log('🔄 Création des index (dashboard et related)...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_reminders_dashboard" 
        ON "reminders" ("user_id", "status", "due_date");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_reminders_related" 
        ON "reminders" ("related_type", "related_id");
    `);
    console.log('✅ Index créés avec succès');

    // Vérification finale
    console.log('\n🔍 VÉRIFICATION DE LA TABLE REMINDERS DANS NEON :');
    
    // Check colonnes
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reminders';
    `);
    console.log('\n📝 Colonnes actuelles :');
    for (const row of columnsResult.rows) {
      console.log(`- ${row.column_name} : ${row.data_type}`);
    }

    // Check index
    const indexResult = await db.execute(sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'reminders';
    `);
    console.log('\n⚡ Index actuels :');
    for (const row of indexResult.rows) {
      console.log(`- ${row.indexname}`);
    }

    console.log('\n🎉 Tout est parfaitement synchronisé !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  }
}

main();
