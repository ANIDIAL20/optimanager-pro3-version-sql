import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_ZD5KOCyQoH9d@ep-patient-block-agvn05j2-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // 1. Count products where prix_vente IS NULL
  const r1 = await client.query(`SELECT COUNT(*) AS count FROM products WHERE prix_vente IS NULL`);
  console.log(`\n=== Products with prixVente = NULL: ${r1.rows[0].count} ===`);

  // 2. Total active products
  const r2 = await client.query(`SELECT COUNT(*) AS count FROM products WHERE deleted_at IS NULL`);
  console.log(`=== Total active products: ${r2.rows[0].count} ===`);

  // 3. Products with marqueId that have no matching brand
  const r3 = await client.query(`
    SELECT COUNT(*) AS count FROM products p
    WHERE p.marque_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = p.marque_id)
      AND p.deleted_at IS NULL
  `);
  console.log(`=== Products with orphan marqueId (no brand match): ${r3.rows[0].count} ===`);

  // 4. Products with valid marqueId JOIN
  const r4 = await client.query(`
    SELECT COUNT(*) AS count FROM products p
    INNER JOIN brands b ON b.id = p.marque_id
    WHERE p.deleted_at IS NULL
  `);
  console.log(`=== Products with valid marqueId + brand join: ${r4.rows[0].count} ===`);

  // 5. Sample brands
  const r5 = await client.query(`SELECT id, name FROM brands LIMIT 10`);
  console.log(`\n=== Sample brands table (id -> name): ===`);
  r5.rows.forEach(b => console.log(`  id=${b.id}  name="${b.name}"`));

  // 6. Sample products with marqueId showing JOIN result
  const r6 = await client.query(`
    SELECT p.id, p.nom, p.marque_id, p.marque, b.name AS brand_name
    FROM products p
    LEFT JOIN brands b ON b.id = p.marque_id
    WHERE p.marque_id IS NOT NULL AND p.deleted_at IS NULL
    LIMIT 5
  `);
  console.log(`\n=== Sample products with marqueId (LEFT JOIN brands): ===`);
  r6.rows.forEach(p =>
    console.log(`  id=${p.id}  nom="${p.nom}"  marque_id=${p.marque_id}  marque="${p.marque}"  brand_name="${p.brand_name}"`)
  );

  // 7. Sample NULL prix_vente
  const r7 = await client.query(`SELECT id, nom, prix_vente FROM products WHERE prix_vente IS NULL LIMIT 5`);
  if (r7.rows.length > 0) {
    console.log(`\n=== Sample products with NULL prix_vente: ===`);
    r7.rows.forEach(p => console.log(`  id=${p.id}  nom="${p.nom}"  prix_vente=${p.prix_vente}`));
  } else {
    console.log(`\n=== No products with NULL prix_vente found ===`);
  }

  await client.end();
}

main().catch(e => { console.error('DB Error:', e.message); process.exit(1); });
