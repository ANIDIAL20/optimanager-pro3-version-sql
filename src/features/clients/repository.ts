
import { BaseRepository } from '@/lib/repositories/base.repository';
import { clients } from '@/db/schema';
import { db } from '@/db';
import { eq, and, like, or, desc, sql } from 'drizzle-orm';
import { CACHE_TAGS, redis } from '@/lib/cache/redis';

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export class ClientRepository extends BaseRepository<Client, typeof clients> {
  constructor() {
    super(clients, 'clients');
  }

  /**
   * Trouve tous les clients d'un utilisateur spécifique (Propriétaire du magasin)
   */
  async findByUserId(userId: string, role: string = 'user'): Promise<Client[]> {
    
    // 🔑 1. Cache Key Differentiation
    const isAdmin = role?.toUpperCase() === 'ADMIN';
    const cacheKey = isAdmin 
        ? CACHE_TAGS.clients('__ADMIN_ALL__') 
        : CACHE_TAGS.clients(userId);

    // 2. Try Cache
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return cached as Client[];
      } catch (e) {
        console.warn('Redis error:', e);
      }
    }

    // 3. DB Query
    try {
        let results: Client[];
        
        if (isAdmin) {
            results = await db
                .select()
                .from(clients)
                .where(eq(clients.isActive, true))
                .orderBy(desc(clients.createdAt));
        } else {
            results = await db
                .select()
                .from(clients)
                .where(and(
                    eq(clients.userId, userId),
                    eq(clients.isActive, true)
                ))
                .orderBy(desc(clients.createdAt));
        }

        // 4. Set Cache
        if (redis) {
            try {
                await redis.set(cacheKey, JSON.stringify(results), { ex: 300 });
            } catch (e) {
                console.warn('Redis error:', e);
            }
        }

        return results;

    } catch (err: any) {
        console.error('❌ DB_QUERY_ERROR [findByUserId]:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            hint: err.hint,
            userId,
            role,
            isAdmin
        });
        throw err;
    }
  }

  /**
   * Recherche avancée de clients
   */
  async search(userId: string, query: string): Promise<Client[]> {
    // Pas de cache pour les recherches (trop dynamique)
    return await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.userId, userId),
          eq(clients.isActive, true),
          or(
            like(clients.fullName, `%${query}%`),
            like(clients.phone, `%${query}%`),
            like(clients.email, `%${query}%`)
          )
        )
      )
      .limit(20);
  }

  /**
   * Crée un nouveau client et invalide le cache de liste
   */
  async createClient(data: NewClient): Promise<Client> {
    const result = await db.insert(clients).values(data).returning();
    const newClient = result[0];

    // Invalidate list cache
    await this.invalidateListCache(data.userId);

    return newClient;
  }

  /**
   * Met à jour un client
   */
  async updateClient(id: number, userId: string, data: Partial<NewClient>): Promise<Client> {
    const result = await db
      .update(clients)
      .set(data)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)))
      .returning();
      
    if (!result[0]) throw new Error('Client not found or unauthorized');

    // Invalidate caches
    await this.invalidateCache(id);
    await this.invalidateListCache(userId);

    return result[0];
  }

  /**
   * Supprime un client
   */
  async deleteClient(id: number, userId: string): Promise<void> {
    const result = await db
        .delete(clients)
        .where(and(eq(clients.id, id), eq(clients.userId, userId)))
        .returning();

    if (!result[0]) throw new Error('Client not found or unauthorized');
    
    await this.invalidateCache(id);
    await this.invalidateListCache(userId);
  }

  /**
   * Invalide le cache de la liste des clients
   */
  private async invalidateListCache(userId: string) {
    if (redis) {
      await redis.del(CACHE_TAGS.clients(userId));
    }
  }
}

export const clientRepository = new ClientRepository();
