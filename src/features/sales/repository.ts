

import { BaseRepository } from '@/lib/repositories/base.repository';
import { sales, stockMovements, products, lensOrders } from '@/db/schema';
import { db } from '@/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
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
   * CRITICAL: Crée une vente, met à jour le stock, et gère les commandes de verres
   */
  async createSale(data: NewSale, items: any[], lensOrderIds?: number[]): Promise<Sale> {
    return await db.transaction(async (tx) => {
      // 1. Create Sale
      const saleResult = await tx.insert(sales).values(data).returning();
      const newSale = saleResult[0];

      // 2. Process Items
      for (const item of items) {
        // Stock management
        if (item.productId) {
          const productId = typeof item.productId === 'string' ? parseInt(item.productId) : item.productId;
          if (!isNaN(productId)) {
            // Decrement stock
            await tx
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
            await tx.insert(stockMovements).values({
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

        // 3. SMART LOGIC: Auto-create lens_orders if item is a lens
        const isLens = item.productType === 'lens' || 
                      item.name?.toLowerCase().includes('verre') || 
                      (item.lensDetails && item.lensDetails.length > 0);

        if (isLens && item.lensDetails && item.lensDetails.length >= 2) {
          const od = item.lensDetails.find((d: any) => d.eye === 'OD');
          const og = item.lensDetails.find((d: any) => d.eye === 'OG');

          await tx.insert(lensOrders).values({
            userId: data.userId,
            clientId: data.clientId,
            saleId: newSale.id,
            supplierName: 'A commander', // Default
            orderType: 'unifocal', // Default or detect from name
            lensType: item.name || 'Verres',
            
            // Optical specs
            sphereR: od?.sphere || '',
            cylindreR: od?.cylinder || '',
            axeR: od?.axis || '',
            additionR: od?.addition || '',
            
            sphereL: og?.sphere || '',
            cylindreL: og?.cylinder || '',
            axeL: og?.axis || '',
            additionL: og?.addition || '',

            unitPrice: item.price.toString(),
            quantity: item.quantity,
            totalPrice: item.total.toString(),
            sellingPrice: item.price.toString(),
            status: 'pending',
            createdAt: new Date()
          });
        }
      }

      // 4. Link existing lens orders if any (from reservations/prescriptions)
      if (lensOrderIds && lensOrderIds.length > 0) {
        await tx.update(lensOrders)
          .set({
            saleId: newSale.id,
            status: 'delivered',
            deliveredDate: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            inArray(lensOrders.id, lensOrderIds),
            eq(lensOrders.userId, data.userId)
          ));
      }

      // Invalidate caches after transaction success
      await this.invalidateListCache(data.userId);

      return newSale;
    });
  }

  private async invalidateListCache(userId: string) {
    if (redis) {
      await redis.del(CACHE_TAGS.sales(userId));
    }
  }
}

export const saleRepository = new SaleRepository();
