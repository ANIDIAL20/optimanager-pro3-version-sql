// Script de migration: Ajoute amount_paid dans lens_orders
// Exécuter: node scripts/migrate-amount-paid.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Applying migration: ADD COLUMN amount_paid to lens_orders...');
    
    await client.query(`
      ALTER TABLE "lens_orders"
      ADD COLUMN IF NOT EXISTS "amount_paid" NUMERIC(10, 2) DEFAULT 0
    `);
    
    console.log('✅ Migration OK: amount_paid ajouté dans lens_orders');
    console.log('💡 La colonne est nullable avec une valeur par défaut à 0.');
    console.log('💡 Les commandes existantes garderont amount_paid = 0.');
  } catch (err) {
    console.error('❌ Erreur migration:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
