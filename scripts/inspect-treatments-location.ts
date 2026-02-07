
import { db } from '@/db';
import { treatments, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔍 Inspecting Treatments Data Location...');

  // 1. Check dedicated table
  try {
    const treatmentsRows = await db.select().from(treatments);
    console.log(`\n[Table: treatments] Found ${treatmentsRows.length} rows.`);
    treatmentsRows.forEach(t => console.log(` - ID: ${t.id}, Name: ${t.name}, User: ${t.userId}`));
  } catch (e) {
    console.error('Error querying treatments table:', e);
  }

  // 2. Check settings table
  try {
    const settingsRow = await db.select().from(settings).where(eq(settings.settingKey, 'treatments'));
    console.log(`\n[Table: settings] Found ${settingsRow.length} rows with key 'treatments'.`);
    settingsRow.forEach(s => console.log(` - Value: ${JSON.stringify(s.value)}`));
  } catch (e) {
    console.error('Error querying settings table:', e);
  }
}

main();
