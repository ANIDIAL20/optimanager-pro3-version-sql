

import { BaseRepository } from '@/lib/repositories/base.repository';
import { sales, stockMovements, products } from '@/db/schema';
import { db } from '@/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { CACHE_TAGS, redis } from '@/lib/cache/redis';

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

export class SaleRepository extends BaseRepository<Sale, typeof sales> {
  constructor() {
    super(sales, 'sales');
  }

  /**
   * Trouve toutes les ventes d'un utilisateur
   */
  async findByUserId(userId: string): Promise<Sale[]> {
    const cacheKey = CACHE_TAGS.sales(userId);

    // 1. Try Cache
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return cached as Sale[];
      } catch (e) {
        console.warn('Redis error:', e);
      }
    }

    // 2. DB Query
    const results = await db
      .select()
      .from(sales)
      .where(eq(sales.userId, userId))
      .orderBy(desc(sales.createdAt));

    // 3. Set Cache
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(results), { ex: 300 });
      } catch (e) {
        console.warn('Redis error:', e);
      }
    }

    return results;
  }

  /**
   * CRITICAL: Crée une vente ET met à jour le stock
   * Note: HTTP driver doesn't support transactions, so we do sequential operations
   */
  async createSale(data: NewSale, items: any[]): Promise<Sale> {
    
    // 1. Create Sale first
    const saleResult = await db.insert(sales).values(data).returning();
    const newSale = saleResult[0];

    try {
      // 2. Update Stock for each item
      for (const item of items) {
         if (item.productId) {
             const productId = parseInt(item.productId);
             
             // Decrement stock using SQL
             await db
                 .update(products)
                 .set({ 
                     quantiteStock: sql`${products.quantiteStock} - ${item.quantity}`,
                     updatedAt: new Date()
                 })
                 .where(and(
                     eq(products.id, productId), 
                     eq(products.userId, data.userId)
                 ));

             // Log movement
             await db.insert(stockMovements).values({
                 userId: data.userId,
                 productId: productId,
                 quantite: -item.quantity,
                 type: 'Vente',
                 ref: `Vente #${newSale.saleNumber || newSale.id}`,
                 date: new Date(),
                 createdAt: new Date()
             });
         }
      }

      // Invalidate caches
      await this.invalidateListCache(data.userId);

      return newSale;
    } catch (error) {
      // If stock update fails, we should ideally delete the sale, but for now just log
      console.error('Error updating stock for sale:', newSale.id, error);
      throw error;
    }
  }

  private async invalidateListCache(userId: string) {
    if (redis) {
      await redis.del(CACHE_TAGS.sales(userId));
    }
  }
}

export const saleRepository = new SaleRepository();
