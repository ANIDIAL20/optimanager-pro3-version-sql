import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  console.log("Creating supplier_balance_view...");
  try {
    await db.execute(sql.raw(`
    CREATE OR REPLACE VIEW supplier_balance_view AS
    SELECT
      s.id        AS supplier_id,
      s.user_id,
      COALESCE(orders_agg.total_achats,      0) AS total_achats,
      COALESCE(payments_agg.total_paiements, 0) AS total_paiements,
      COALESCE(orders_agg.total_achats,      0)
        - COALESCE(payments_agg.total_paiements, 0) AS solde_reel
    FROM suppliers s
    LEFT JOIN (
      SELECT supplier_id, user_id, SUM(COALESCE(sub_total, montant_total)) AS total_achats
      FROM supplier_orders
      WHERE deleted_at IS NULL
      GROUP BY supplier_id, user_id
    ) AS orders_agg
      ON orders_agg.supplier_id = s.id AND orders_agg.user_id = s.user_id
    LEFT JOIN (
      SELECT supplier_id, user_id, SUM(amount) AS total_paiements
      FROM supplier_payments
      WHERE deleted_at IS NULL
      GROUP BY supplier_id, user_id
    ) AS payments_agg
      ON payments_agg.supplier_id = s.id AND payments_agg.user_id = s.user_id;
    `));
    console.log("✅ supplier_balance_view created successfully!");
  } catch (e: any) {
    console.error("❌ Error:", e.stack);
  }
  process.exit(0);
}

run();
