import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * Rafraîchir la vue matérialisée des soldes fournisseurs
 */
export async function refreshSupplierBalances(): Promise<void> {
  try {
    console.log('🔄 Refreshing supplier_balances_view...');
    // CONCURRENTLY permet de ne pas bloquer les lectures pendant le rafraîchissement
    // Note: Nécessite un index UNIQUE sur la vue (déjà créé dans la migration)
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_balances_view`);
    console.log('✅ View refreshed successfully.');
  } catch (error) {
    console.error('❌ Failed to refresh materialized view:', error);
    throw error;
  }
}
