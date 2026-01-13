import { db } from '@/db';
import { redis, CACHE_TTL } from '@/lib/cache/redis';
import { eq, and } from 'drizzle-orm';
import { type PgTable } from 'drizzle-orm/pg-core';

export abstract class BaseRepository<T extends { id: any }, TTable extends PgTable> {
  constructor(
    protected table: TTable,
    protected tableName: string
  ) {}

  /**
   * Génère une clé de cache unique
   */
  protected generateCacheKey(identifier: string): string {
    return `${this.tableName}:${identifier}`;
  }

  /**
   * Trouve un élément par son ID avec mise en cache
   */
  async findById(id: number | string): Promise<T | null> {
    const cacheKey = this.generateCacheKey(String(id));

    // 1. Check Cache
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return cached as T;
        }
      } catch (e) {
        console.warn('Redis error (get):', e);
      }
    }

    // 2. DB Query
    // @ts-ignore - Drizzle typing for generic findFirst can be tricky
    const result = await db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    const item = result[0] ? result[0] as T : null;

    // 3. Set Cache
    if (item && redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(item), { ex: CACHE_TTL.MEDIUM });
      } catch (e) {
         console.warn('Redis error (set):', e);
      }
    }

    return item;
  }

  /**
   * Invalide le cache pour un item
   */
  async invalidateCache(id: number | string): Promise<void> {
    if (!redis) return;
    try {
      const cacheKey = this.generateCacheKey(String(id));
      await redis.del(cacheKey);
    } catch (e) {
      console.warn('Redis error (del):', e);
    }
  }

  /**
   * Helper pour gérer les erreurs
   */
  protected handleError(error: any, operation: string) {
    console.error(`Repository Error [${this.tableName}.${operation}]:`, error);
    throw new Error(`Failed to ${operation} ${this.tableName}`);
  }
}
