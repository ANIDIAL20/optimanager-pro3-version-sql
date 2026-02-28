'use server';

import { db } from '@/db';
import { frameReservations, lensOrders, products } from '@/db/schema';
import { and, eq, isNull, lte, sql, desc, gte } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { redis } from '@/lib/cache/redis';

const TTL_SECONDS = 120;

async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    if (typeof cached === 'string') return JSON.parse(cached) as T;
    return cached as T;
  } catch {
    return null;
  }
}

async function setCached<T>(key: string, value: T) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: TTL_SECONDS });
  } catch {
    return;
  }
}

export type VerrePretItem = {
  id: number;
  lensType: string;
  sellingPrice: string;
  updatedAt: Date | null;
  client: {
    id: number;
    fullName: string;
    phone: string | null;
  };
};

export const getVerresPrets = secureAction(async (userId) => {
  const cacheKey = `notifications:verres-prets:${userId}`;
  const cached = await getCached<VerrePretItem[]>(cacheKey);
  if (cached) return { success: true as const, data: cached };

  try {
    const results = await db.query.lensOrders.findMany({
      where: and(
        eq(lensOrders.userId, userId),
        eq(lensOrders.status, 'received'),
        isNull(lensOrders.saleId)
      ),
      columns: {
        id: true,
        lensType: true,
        sellingPrice: true,
        updatedAt: true,
      },
      with: {
        client: {
          columns: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: [desc(lensOrders.updatedAt)],
    });

    await setCached(cacheKey, results as any);
    return { success: true as const, data: results as any };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
});

export type CommandeEnAttenteItem = {
  id: number;
  lensType: string;
  sellingPrice: string;
  updatedAt: Date | null;
  client: {
    id: number;
    fullName: string;
    phone: string | null;
  };
};

export const getCommandesEnAttente = secureAction(async (userId) => {
  const cacheKey = `notifications:commandes-en-attente:${userId}`;
  const cached = await getCached<CommandeEnAttenteItem[]>(cacheKey);
  if (cached) return { success: true as const, data: cached };

  try {
    const results = await db.query.lensOrders.findMany({
      where: and(
        eq(lensOrders.userId, userId),
        eq(lensOrders.status, 'pending') // Only pending orders
      ),
      columns: {
        id: true,
        lensType: true,
        sellingPrice: true,
        updatedAt: true,
      },
      with: {
        client: {
          columns: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: [desc(lensOrders.updatedAt)],
    });

    await setCached(cacheKey, results as any);
    return { success: true as const, data: results as any };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
});

export type ReservationExpiringItem = {
  id: number;
  clientId: number;
  clientName: string;
  expiryDate: Date;
  items: any;
  status: string;
};

export const getReservationsExpiring = secureAction(async (userId) => {
  const cacheKey = `notifications:reservations-expiring:${userId}`;
  const cached = await getCached<ReservationExpiringItem[]>(cacheKey);
  if (cached) return { success: true as const, data: cached };

  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const results = await db
      .select({
        id: frameReservations.id,
        clientId: frameReservations.clientId,
        clientName: frameReservations.clientName,
        expiryDate: frameReservations.expiryDate,
        items: frameReservations.items,
        status: frameReservations.status,
      })
      .from(frameReservations)
      .where(
        and(
          eq(frameReservations.storeId, userId),
          eq(frameReservations.status, 'PENDING'),
          gte(frameReservations.expiryDate, now),
          lte(frameReservations.expiryDate, in7Days)
        )
      )
      .orderBy(sql`${frameReservations.expiryDate} ASC`);

    await setCached(cacheKey, results as any);
    return { success: true as const, data: results as any };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
});

export type StockCritiqueItem = {
  id: string;
  nom: string;
  reference: string | null;
  quantiteStock: number;
};

export const getStockCritique = secureAction(async (userId) => {
  const cacheKey = `notifications:stock-critique:${userId}`;
  const cached = await getCached<StockCritiqueItem[]>(cacheKey);
  if (cached) return { success: true as const, data: cached };

  try {
    const results = await db
      .select({
        id: sql<string>`${products.id}::text`,
        nom: products.nom,
        reference: products.reference,
        quantiteStock: products.quantiteStock,
      })
      .from(products)
      .where(
        and(
          eq(products.userId, userId),
          sql`${products.deletedAt} IS NULL`,
          lte(products.quantiteStock, 2)
        )
      )
      .orderBy(sql`${products.quantiteStock} ASC`);

    await setCached(cacheKey, results as any);
    return { success: true as const, data: results as any };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
});

export const getNotificationsCount = secureAction(async (userId) => {
  const cacheKey = `notifications:count:${userId}`;
  const cached = await getCached<{
    commandesEnAttente: number;
    verresPrets: number;
    reservationsExpiring: number;
    stockCritique: number;
    total: number;
  }>(cacheKey);
  if (cached) return { success: true as const, data: cached };

  try {
    const [commandes, verres, reservations, stock] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(lensOrders)
        .where(
          and(
            eq(lensOrders.userId, userId),
            eq(lensOrders.status, 'pending')
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(lensOrders)
        .where(
          and(
            eq(lensOrders.userId, userId),
            eq(lensOrders.status, 'received'),
            isNull(lensOrders.saleId)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(frameReservations)
        .where(() => {
          const now = new Date();
          const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return and(
            eq(frameReservations.storeId, userId),
            eq(frameReservations.status, 'PENDING'),
            gte(frameReservations.expiryDate, now),
            lte(frameReservations.expiryDate, in7Days)
          );
        }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
          and(
            eq(products.userId, userId),
            sql`${products.deletedAt} IS NULL`,
            lte(products.quantiteStock, 2)
          )
        ),
    ]);

    const commandesEnAttente = Number(commandes[0]?.count || 0);
    const verresPrets = Number(verres[0]?.count || 0);
    const reservationsExpiring = Number(reservations[0]?.count || 0);
    const stockCritique = Number(stock[0]?.count || 0);

    const data = {
      commandesEnAttente,
      verresPrets,
      reservationsExpiring,
      stockCritique,
      total: commandesEnAttente + verresPrets + reservationsExpiring + stockCritique,
    };

    await setCached(cacheKey, data);
    return { success: true as const, data };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
});
