
import { BaseRepository } from '@/lib/repositories/base.repository';
import { products } from '@/db/schema';
import { db } from '@/db';
import { eq, and, like, or, desc, lte } from 'drizzle-orm';
import { CACHE_TAGS, redis } from '@/lib/cache/redis';

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export class ProductRepository extends BaseRepository<Product, typeof products> {
  constructor() {
    super(products, 'products');
  }

  /**
   * Trouve tous les produits d'un utilisateur sécurisé
   */
  async findByUserId(userId: string): Promise<Product[]> {
    const cacheKey = CACHE_TAGS.products(userId);

    // 1. Try Cache
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return cached as Product[];
      } catch (e) {
        console.warn('Redis error:', e);
      }
    }

    // 2. DB Query
    const results = await db
      .select()
      .from(products)
      .where(and(eq(products.userId, userId), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt));

    // 3. Set Cache (Short TTL because stock moves fast)
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
   * Recherche de produits par nom ou référence
   */
  async search(userId: string, query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.userId, userId),
          eq(products.isActive, true),
          or(
            like(products.nom, `%${query}%`),
            like(products.reference, `%${query}%`),
            like(products.marque, `%${query}%`)
          )
        )
      )
      .limit(50);
  }

  /**
   * Trouve les produits en stock faible
   */
  async findLowStock(userId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.userId, userId),
          eq(products.isActive, true),
           // lte(products.quantiteStock, products.seuilAlerte)
        )
      );
  }

  /**
   * Récupère les catégories distinctes
   */
  async getCategories(userId: string): Promise<string[]> {
    const results = await db
      .selectDistinct({ category: products.categorie })
      .from(products)
      .where(and(eq(products.userId, userId), eq(products.isActive, true)));

    return (results as Array<{ category: string | null }>)
      .map(r => r.category)
      .filter((c): c is string => !!c && c.trim() !== '')
      .sort();
  }

  /**
   * Crée un produit
   */
  async createProduct(data: NewProduct): Promise<Product> {
    const result = await db.insert(products).values(data).returning();
    await this.invalidateListCache(data.userId);
    return result[0];
  }

  /**
   * Met à jour un produit
   */
  async updateProduct(id: number, userId: string, data: Partial<NewProduct>): Promise<Product> {
    const result = await db
      .update(products)
      .set(data)
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .returning();

    if (!result[0]) throw new Error('Product not found or unauthorized');

    await this.invalidateCache(id);
    await this.invalidateListCache(userId);

    return result[0];
  }

  async deleteProduct(id: number, userId: string): Promise<void> {
    await db
      .update(products)
      .set({ isActive: false })
      .where(and(eq(products.id, id), eq(products.userId, userId)));

    await this.invalidateCache(id);
    await this.invalidateListCache(userId);
  }

  private async invalidateListCache(userId: string) {
    if (redis) {
      await redis.del(CACHE_TAGS.products(userId));
    }
  }
  async findById(id: number): Promise<Product | null> {
    const cacheKey = CACHE_TAGS.products(id.toString());
    
    // 1. Check Cache
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) return cached as Product;
        } catch (e) {
            console.warn('Redis error:', e);
        }
    }

    // 2. DB Query - Explicit usage of products table to avoid BaseRepository generic issues
    try {
        const result = await db
            .select()
            .from(products)
            .where(eq(products.id, id))
            .limit(1);
        
        const item = result[0] || null;

        // 3. Set Cache
        if (item && redis) {
            try {
                await redis.set(cacheKey, JSON.stringify(item), { ex: 300 });
            } catch (e) {
                console.warn('Redis error:', e);
            }
        }

        return item;
    } catch (error: any) {
        console.error('ProductRepository.findById error:', {
            id,
            error: error.message,
            stack: error.stack,
            details: error
        });
        throw new Error(`Impossible de récupérer le produit (ID: ${id}): ${error.message}`);
    }
  }
}

export const productRepository = new ProductRepository();
