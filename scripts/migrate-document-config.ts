import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔧 Adding document_config column if missing...');
  await db.execute(
    sql`ALTER TABLE shop_profiles ADD COLUMN IF NOT EXISTS document_config JSONB DEFAULT '{}'`
  );
  console.log('✅ document_config column is confirmed present in shop_profiles.');
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
