import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { products, suppliers, reminders } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Cached products loader
 * Revalidates every 60 seconds
 */
export const getCachedProducts = unstable_cache(
  async (userId: string) => {
    // console.log(`🔄 Fetching products from DB for user: ${userId}`);
    return await db.select()
      .from(products)
      .where(eq(products.userId, userId));
  },
  ['products-list'],
  { 
    revalidate: 60,
    tags: ['products'] 
  }
);

/**
 * Cached suppliers loader
 * Revalidates every 5 minutes
 */
export const getCachedSuppliers = unstable_cache(
  async (userId: string) => {
    // console.log(`🔄 Fetching suppliers from DB for user: ${userId}`);
    return await db.select()
      .from(suppliers)
      .where(eq(suppliers.userId, userId));
  },
  ['suppliers-list'],
  { 
    revalidate: 300,
    tags: ['suppliers']
  }
);
// ... existing loaders ...

/**
 * Cached reminders loader
 * Revalidates every 30 seconds
 */
export const getCachedReminders = unstable_cache(
  async (userId: string) => {
    // console.log(`🔄 Fetching pending reminders from DB for user: ${userId}`);
    return await db.select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.status, 'pending')
        )
      )
      .orderBy(desc(reminders.createdAt));
  },
  ['reminders-list'],
  { 
    revalidate: 30,
    tags: ['reminders']
  }
);
