import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function migrateTvaData() {
  console.log("🔄 Starting Smart TVA Data Migration...");

  try {
    // Dynamic import to ensure dotenv loads first
    const { db } = await import("../src/db");
    const { sql } = await import("drizzle-orm");

    // 1. Update existing products to have correct default TVA values
    // We assume stored price is TTC as per migration plan
    const result = await db.execute(sql`
      UPDATE products 
      SET 
        sale_price_ttc = prix_vente,
        sale_price_ht = ROUND(prix_vente::numeric / 1.20, 2),
        sale_price_tva = ROUND(prix_vente::numeric - (prix_vente::numeric / 1.20), 2),
        has_tva = true,
        price_type = 'TTC',
        updated_at = NOW()
      WHERE deleted_at IS NULL 
        AND (sale_price_ttc IS NULL OR price_type IS NULL);
    `);

    console.log("✅ Migration completed successfully.");
    
  } catch (error) {
    console.error("❌ Migration Failed:", error);
    process.exit(1);
  }
}

migrateTvaData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
