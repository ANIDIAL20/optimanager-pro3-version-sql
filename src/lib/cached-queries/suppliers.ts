import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { querySuppliersListPaginated, type GetSuppliersParams } from '@/lib/db-queries/suppliers';

/**
 * Cached wrapper for supplier list.
 * ⚠️ A utiliser UNIQUEMENT dans les Server Components (ex: page.tsx).
 *
 * userId est extrait AVANT l'appel (auth() hors du cache) et passé en argument.
 * La fonction interne est une requête DB pure, sans auth() ni headers().
 */
export const getCachedSuppliersList = (
  userId: string,
  params: GetSuppliersParams
) => {
  return unstable_cache(
    // ✅ pure DB query — aucun appel à auth() ou headers()
    () => querySuppliersListPaginated(userId, params),
    [
      `suppliers`,
      userId,
      String(params.page     ?? 1),
      String(params.search   ?? ''),
      String(params.category ?? ''),
    ],
    {
      tags: [
        CACHE_TAGS.suppliers,
        `${CACHE_TAGS.suppliers}-${userId}`,
      ],
      revalidate: 30,
    }
  )();
};
