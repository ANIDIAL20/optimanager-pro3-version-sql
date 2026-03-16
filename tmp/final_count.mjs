import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://neondb_owner:npg_ZD5KOCyQoH9d@ep-patient-block-agvn05j2-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function checkNull() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT COUNT(*) FROM products WHERE prix_vente IS NULL AND deleted_at IS NULL");
    console.log(`\nRESULT_COUNT:${res.rows[0].count}\n`);
  } catch (err) {
    console.error("Error connecting or querying:", err.message);
  } finally {
    await client.end();
  }
}

checkNull();
