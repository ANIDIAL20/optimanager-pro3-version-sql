
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Dropping reminders table...');
  await db.execute(sql`DROP TABLE IF EXISTS reminders CASCADE;`);
  console.log('Dropped reminders table.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
