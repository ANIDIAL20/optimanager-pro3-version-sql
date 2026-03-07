require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Fetching columns for "suppliers" table...');
  const result = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  
  const columns = result.map((r: any) => r.column_name);
  console.log('Current columns:', columns);

  const missingColumns = [];
  if (!columns.includes('contact_name')) missingColumns.push('contact_name VARCHAR(255)');
  if (!columns.includes('contact_phone')) missingColumns.push('contact_phone VARCHAR(50)');
  if (!columns.includes('contact_email')) missingColumns.push('contact_email VARCHAR(255)');
  
  if (missingColumns.length > 0) {
    console.log(`Adding missing columns: ${missingColumns.join(', ')}`);
    for (const col of missingColumns) {
      await sql(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ${col};`);
      console.log(`✅ Added column: ${col}`);
    }
  } else {
    console.log('All contact columns are already present.');
  }
}

main().catch(console.error);
