/**
 * scripts/create-views.ts
 * 
 * ⚠️ IMPORTANT: drizzle-kit push ne crée PAS les SQL Views.
 * Ce script doit être exécuté après chaque `drizzle-kit push`.
 * 
 * Usage direct : npx tsx --env-file=.env.local scripts/create-views.ts
 * Usage via npm : npm run db:push  (exécute push + views automatiquement)
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function createViews() {
  console.log('📦 Création des SQL Views...\n');

  // ─────────────────────────────────────────────────────────────────
  // supplier_balance_view
  // Calcule dynamiquement le solde de chaque fournisseur
  // en agrégeant commandes et paiements.
  // Utiliser cette view TOUJOURS à la place de suppliers.current_balance (@deprecated).
  // ─────────────────────────────────────────────────────────────────
  try {
    await db.execute(sql.raw(`
      CREATE OR REPLACE VIEW supplier_balance_view AS
      SELECT
        s.id        AS supplier_id,
        s.user_id,
        COALESCE(SUM(so.montant_total), 0)                            AS total_achats,
        COALESCE(SUM(sp.amount),        0)                            AS total_paiements,
        COALESCE(SUM(so.montant_total), 0) - COALESCE(SUM(sp.amount), 0) AS solde_reel
      FROM suppliers s
      LEFT JOIN supplier_orders so
        ON so.supplier_id = s.id AND so.deleted_at IS NULL
      LEFT JOIN supplier_payments sp
        ON sp.supplier_id = s.id AND sp.deleted_at IS NULL
      GROUP BY s.id, s.user_id;
    `));
    console.log('  ✅ supplier_balance_view — OK');
  } catch (e: any) {
    console.error('  ❌ supplier_balance_view — ERREUR:', e.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // Ajoutez d'autres views ici au besoin :
  //
  // try {
  //   await db.execute(sql.raw(`CREATE OR REPLACE VIEW ... AS ...`));
  //   console.log('  ✅ autre_view — OK');
  // } catch (e: any) {
  //   console.error('  ❌ autre_view — ERREUR:', e.message);
  // }
  // ─────────────────────────────────────────────────────────────────

  console.log('\n🎉 Toutes les views sont à jour.');
  process.exit(0);
}

createViews();
