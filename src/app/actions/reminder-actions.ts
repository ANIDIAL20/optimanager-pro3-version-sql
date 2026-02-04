'use server';

import { db } from '@/db';

import { reminders, products, sales, supplierOrders } from '@/db/schema';

import { auth } from '@/auth';
import { eq, and, desc, lt, gte, or, lte, isNull, gt, sql } from 'drizzle-orm'; // verified
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schema validation for reminders
const reminderSchema = z.object({
  type: z.enum(['cheque', 'payment', 'stock', 'order', 'appointment', 'maintenance', 'admin']),
  priority: z.enum(['urgent', 'important', 'normal', 'info']).default('normal'),
  title: z.string().min(1, 'Le titre est requis'),
  message: z.string().optional(),
  status: z.enum(['pending', 'read', 'completed', 'ignored']).default('pending'),
  dueDate: z.string().optional().nullable(), // String for form submission, converted to Date
  relatedId: z.number().optional().nullable(),
  relatedType: z.string().optional().nullable(),
  metadata: z.any().optional(),
});

export type ReminderInput = z.infer<typeof reminderSchema>;

/**
 * Get all reminders for the current user
 */
export async function getReminders(filters?: {
  status?: string;
  priority?: string;
  type?: string;
  limit?: number;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  let query = db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, session.user.id))
    .orderBy(desc(reminders.createdAt));

  // Apply filters
  if (filters?.status && filters.status !== 'all') {
    // @ts-ignore
    query = query.where(eq(reminders.status, filters.status));
  }
  
  if (filters?.priority && filters.priority !== 'all') {
    // @ts-ignore
    query = query.where(eq(reminders.priority, filters.priority));
  }

  if (filters?.type && filters.type !== 'all') {
    // @ts-ignore
    query = query.where(eq(reminders.type, filters.type));
  }

  if (filters?.limit) {
    // @ts-ignore
    query = query.limit(filters.limit);
  }

  const data = await query;
  return data;
}

/**
 * Get reminder counts by status
 */
export async function getReminderStats() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const allReminders = await db
    .select({
      status: reminders.status,
      priority: reminders.priority,
      dueDate: reminders.dueDate,
    })
    .from(reminders)
    .where(eq(reminders.userId, session.user.id));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = {
    total: allReminders.length,
    pending: allReminders.filter(r => r.status === 'pending').length,
    urgent: allReminders.filter(r => r.priority === 'urgent' && r.status === 'pending').length,
    today: allReminders.filter(r => {
      if (!r.dueDate || r.status !== 'pending') return false;
      const d = new Date(r.dueDate);
      return d >= today && d < tomorrow;
    }).length,
  };

  return stats;
}

/**
 * Create a new reminder
 */
export async function createReminder(data: any) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  // Check for Batch Config
  const batchConfig = data.metadata?.batchConfig;

  if (batchConfig && batchConfig.mode !== 'simple') {
      // --- BATCH CREATION ---
      const remindersToCreate: any[] = [];
      const startDate = data.dueDate ? new Date(data.dueDate) : new Date();

      if (batchConfig.mode === 'recurring') {
          // Recurring Logic
          const count = batchConfig.count || 1;
          const frequency = batchConfig.frequency || 'weekly';

          for (let i = 0; i < count; i++) {
              const currentDate = new Date(startDate);
               
              // Add offset based on frequency
              if (frequency === 'daily') currentDate.setDate(startDate.getDate() + i);
              if (frequency === 'weekly') currentDate.setDate(startDate.getDate() + (i * 7));
              if (frequency === 'monthly') currentDate.setMonth(startDate.getMonth() + i);

              remindersToCreate.push({
                  userId: session.user.id,
                  ...data,
                  title: `${data.title} (${i + 1}/${count})`,
                  dueDate: currentDate,
                  metadata: JSON.stringify({ 
                      ...data.metadata,
                      batchId: Date.now().toString(), // Group ID
                      index: i + 1,
                      total: count 
                  })
              });
          }

      } else if (batchConfig.mode === 'installment') {
          // Installment Logic
          const months = batchConfig.months || 1;
          const totalAmount = batchConfig.totalAmount || 0;
          const monthlyAmount = (totalAmount / months).toFixed(2);

          for (let i = 0; i < months; i++) {
              const currentDate = new Date(startDate);
              currentDate.setMonth(startDate.getMonth() + i);

              remindersToCreate.push({
                  userId: session.user.id,
                  ...data,
                  title: `${data.title} (${i + 1}/${months})`,
                  message: `${data.message || ''}\n\nÉchéance ${i + 1}/${months}: ${monthlyAmount} DH`,
                  dueDate: currentDate,
                  metadata: JSON.stringify({ 
                      ...data.metadata,
                      batchId: Date.now().toString(),
                      installmentAmount: monthlyAmount,
                      installmentIndex: i + 1,
                      installmentTotal: months 
                  })
              });
          }
      }

      // Bulk Insert
      if (remindersToCreate.length > 0) {
          await db.insert(reminders).values(remindersToCreate);
      }

      revalidatePath('/dashboard');
      return { success: true, count: remindersToCreate.length };

  } else {
      // --- SINGLE CREATION (Legacy) ---
      const [newReminder] = await db
        .insert(reminders)
        .values({
          userId: session.user.id,
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        } as any)
        .returning();

      revalidatePath('/dashboard');
      return newReminder;
  }
}

/**
 * Mark a reminder as read
 */
export async function markReminderAsRead(id: number) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const [updated] = await db
    .update(reminders)
    .set({
      status: 'read',
      updatedAt: new Date(),
    } as any)
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.userId, session.user.id)
      )
    )
    .returning();

  revalidatePath('/dashboard');
  revalidatePath('/', 'layout'); // Update sidebar badge
  return updated;
}

/**
 * Mark a reminder as completed
 */
export async function completeReminder(id: number) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const [updated] = await db
    .update(reminders)
    .set({
      status: 'completed',
      updatedAt: new Date(),
    } as any)
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.userId, session.user.id)
      )
    )
    .returning();

  revalidatePath('/dashboard');
  revalidatePath('/', 'layout'); // Update sidebar badge
  return updated;
}

/**
 * Delete a reminder
 */
export async function deleteReminder(id: number) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const [deleted] = await db
    .delete(reminders)
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.userId, session.user.id)
      )
    )
    .returning();

  revalidatePath('/dashboard');
  revalidatePath('/', 'layout'); // Update sidebar badge
  return deleted;
}

/**
 * Core Logic: Check deadlines and generate reminders
 * This function should be called periodically or on dashboard load
 */
export async function checkDeadlines(shouldRevalidate = true) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Non authentifié' };
  }

  let newRemindersCount = 0;



  /* 
  // DISABLED: User prefers to monitor stock via visual badges in the Stock Table only.
  // 1. Check Stock Levels
  // Get products with low stock
  const lowStockProducts = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.userId, session.user.id),
        // Use SQL for column-to-column comparison to be safe
        sql`${products.quantiteStock} <= ${products.seuilAlerte}`
      )
    );

  // Check if reminder already exists for each low stock product
  for (const product of lowStockProducts) {
    const existingReminder = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, session.user.id),
          eq(reminders.type, 'stock'),
          eq(reminders.relatedId, product.id),
          eq(reminders.relatedType, 'products'),
          eq(reminders.status, 'pending')
        )
      )
      .limit(1);

    if (existingReminder.length === 0) {
      // Create reminder
      await db.insert(reminders).values({
        userId: session.user.id,
        type: 'stock',
        priority: 'urgent',
        title: `Rupture de stock: ${product.nom}`,
        message: `Le stock pour ${product.nom} est passé sous le seuil d'alerte (${product.quantiteStock} / ${product.seuilAlerte}).`,
        status: 'pending',
        relatedId: product.id,
        relatedType: 'products',
        dueDate: new Date(),
        metadata: JSON.stringify({ details: `Référence: ${product.reference}` }),
      } as any);
      newRemindersCount++;
    }
  }
  */

  // 2. Check Unpaid Sales (Debts)
  // Get unpaid sales
  const unpaidSales = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.userId, session.user.id),
        // @ts-ignore
        gt(sales.resteAPayer, 0)
      )
    );

  // Check if reminder already exists for each unpaid sale
  for (const sale of unpaidSales) {
    const existingReminder = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, session.user.id),
          eq(reminders.type, 'payment'),
          eq(reminders.relatedId, sale.id),
          eq(reminders.relatedType, 'sales'),
          eq(reminders.status, 'pending')
        )
      )
      .limit(1);

    if (existingReminder.length === 0) {
      // Check if it's due (e.g., older than 7 days)
      const saleDate = sale.date ? new Date(sale.date) : new Date();
      const diffTime = Math.abs(new Date().getTime() - saleDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays >= 7) {
        await db.insert(reminders).values({
          userId: session.user.id,
          type: 'payment',
          priority: diffDays > 30 ? 'urgent' : 'important',
          title: `Paiement en attente: ${sale.clientName}`,
          message: `Reste à payer: ${sale.resteAPayer} DH pour la vente #${sale.saleNumber || sale.id}.`,
          status: 'pending',
          relatedId: sale.id,
          relatedType: 'sales',
          dueDate: new Date(), // Due immediately
          metadata: JSON.stringify({ details: `Vente du ${saleDate.toLocaleDateString()}` }),
        } as any);
        newRemindersCount++;
      }
    }

  }

  // 3. Check Supplier Payment Deadlines
  const dueSupplierOrders = await db
    .select()
    .from(supplierOrders)
    .where(
      and(
        eq(supplierOrders.userId, session.user.id),
        // @ts-ignore
        gt(supplierOrders.resteAPayer, 0)
      )
    );

  for (const order of dueSupplierOrders) {
    if (!order.dueDate) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(order.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let shouldRemind = false;
    let priority = 'normal';
    let msg = '';

    if (diffDays < 0) {
      shouldRemind = true;
      priority = 'urgent';
      msg = `FACTURE IMPAYÉE: Commande ${order.fournisseur} en retard de ${Math.abs(diffDays)} jours.`;
    } else if (diffDays <= 3) {
      shouldRemind = true;
      priority = diffDays === 0 ? 'urgent' : 'important';
      msg = `ÉCHÉANCE PROCHE: Commande ${order.fournisseur} à payer dans ${diffDays} jours.`;
    }

    if (shouldRemind) {
      const existingReminder = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, session.user.id),
            eq(reminders.type, 'payment'),
            eq(reminders.relatedId, order.id),
            eq(reminders.relatedType, 'supplier_orders'),
            eq(reminders.status, 'pending')
          )
        )
        .limit(1);

      if (existingReminder.length === 0) {
        await db.insert(reminders).values({
          userId: session.user.id,
          type: 'payment',
          priority: priority,
          title: `Paiement Fournisseur: ${order.fournisseur}`,
          message: msg,
          status: 'pending',
          relatedId: order.id,
          relatedType: 'supplier_orders',
          dueDate: order.dueDate,
          metadata: JSON.stringify({ 
             details: `Montant dû: ${order.resteAPayer} DH`,
             orderId: order.id
          }),
        } as any);
        newRemindersCount++;
      }
    }
  }
  
  if (newRemindersCount > 0 && shouldRevalidate) {
    revalidatePath('/dashboard');
    revalidatePath('/', 'layout'); // Update sidebar badge
  }
  
  return { success: true, message: `Vérification terminée. ${newRemindersCount} nouveaux rappels.` };
}

/**
 * Get count of pending/overdue reminders for badge
 */
export async function getUnreadReminderCount() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return 0;
  }

  try {
    const result = await db
      .select({
        count: reminders.id
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, session.user.id),
          eq(reminders.status, 'pending')
        )
      );

    return result.length;
  } catch (error: any) {
    console.error('❌ REMINDER_QUERY_ERROR:', error);
    console.error('❌ ERROR_CODE:', error.code);
    console.error('❌ ERROR_MESSAGE:', error.message);
    // Return 0 to avoid crashing the UI if it's just a badge count
    return 0;
  }
}
