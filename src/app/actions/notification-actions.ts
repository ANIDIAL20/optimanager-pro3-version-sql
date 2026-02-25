'use server';

import { db } from '@/db';
import { notifications, frameReservations, lensOrders, products, users, clients } from '@/db/schema';
import { eq, and, desc, between, isNull, lte, or, notInArray, sql } from 'drizzle-orm';
import { addDays } from 'date-fns';
import { secureActionWithResponse } from '@/lib/secure-action';
import { revalidatePath } from 'next/cache';

/**
 * Get recent notifications for the authenticated user
 */
export const getRecentNotifications = secureActionWithResponse(async (userId) => {
    try {
        const results = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt))
            .limit(20);

        return results;
    } catch (error) {
        console.error('[getRecentNotifications] Error:', error);
        throw error;
    }
});

/**
 * Mark a specific notification as read
 */
export const markNotificationAsRead = secureActionWithResponse(async (userId, _, id: number) => {
    try {
        await db
            .update(notifications)
            .set({
                isRead: true,
                readAt: new Date()
            } as any)
            .where(and(
                eq(notifications.id, id),
                eq(notifications.userId, userId)
            ));

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('[markNotificationAsRead] Error:', error);
        throw error;
    }
});

/**
 * Mark all unread notifications as read for the user
 */
export const markAllNotificationsAsRead = secureActionWithResponse(async (userId) => {
    try {
        await db
            .update(notifications)
            .set({
                isRead: true,
                readAt: new Date()
            } as any)
            .where(and(
                eq(notifications.userId, userId),
                eq(notifications.isRead, false)
            ));

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('[markAllNotificationsAsRead] Error:', error);
        throw error;
    }
});
/**
 * Sync special alerts for Basic Mode
 * Checks for:
 * 1. Expiring reservations (next 3 days)
 * 2. Lenses ready for delivery (received but not billed)
 * 3. Low stock / Out of stock items
 */
export const syncBasicModeAlerts = secureActionWithResponse(async (userId) => {
    try {
        const now = new Date();
        const threeDaysFromNow = addDays(now, 3);
        const alertsCreated = [];

        // --- 1. EXPIRING RESERVATIONS ---
        const expiringRes = await db
            .select()
            .from(frameReservations)
            .where(and(
                eq(frameReservations.storeId, userId),
                eq(frameReservations.status, 'PENDING'),
                between(frameReservations.expiryDate, now, threeDaysFromNow)
            ));

        for (const res of expiringRes) {
            // Check if unread notification exists
            const existing = await db
                .select()
                .from(notifications)
                .where(and(
                    eq(notifications.userId, userId),
                    eq(notifications.type, 'RESERVATION_EXPIRING'),
                    eq(notifications.relatedEntityId, res.id),
                    eq(notifications.isRead, false)
                ))
                .limit(1);

            if (existing.length === 0) {
                const [notif] = await db.insert(notifications).values({
                    userId,
                    type: 'RESERVATION_EXPIRING',
                    title: 'Réservation expire bientôt',
                    message: `La réservation de ${res.clientName} expire le ${new Date(res.expiryDate).toLocaleDateString('fr-FR')}`,
                    priority: 'HIGH',
                    relatedEntityType: 'reservation',
                    relatedEntityId: res.id,
                }).returning();
                alertsCreated.push(notif);
            }
        }

        // --- 2. LENSES READY FOR DELIVERY ---
        const readyLenses = await db
            .select({
                id: lensOrders.id,
                supplierName: lensOrders.supplierName,
                clientName: clients.fullName
            })
            .from(lensOrders)
            .leftJoin(clients, eq(lensOrders.clientId, clients.id))
            .where(and(
                eq(lensOrders.userId, userId),
                eq(lensOrders.status, 'received'),
                isNull(lensOrders.saleId)
            ));

        for (const order of readyLenses) {
             const existing = await db
                .select()
                .from(notifications)
                .where(and(
                    eq(notifications.userId, userId),
                    eq(notifications.type, 'LENS_READY'),
                    eq(notifications.relatedEntityId, order.id),
                    eq(notifications.isRead, false)
                ))
                .limit(1);

            if (existing.length === 0) {
                const [notif] = await db.insert(notifications).values({
                    userId,
                    type: 'LENS_READY',
                    title: 'Verre prêt pour livraison',
                    message: `Les verres pour le client ${order.clientName || 'Inconnu'} (Fournisseur: ${order.supplierName}) sont arrivés.`,
                    priority: 'MEDIUM',
                    relatedEntityType: 'lens_order',
                    relatedEntityId: order.id,
                }).returning();
                alertsCreated.push(notif);
            }
        }

        // --- 3. LOW STOCK / OUT OF STOCK ---
        const lowStockProducts = await db
            .select()
            .from(products)
            .where(and(
                eq(products.userId, userId),
                eq(products.isActive, true),
                isNull(products.deletedAt),
                or(
                    lte(products.availableQuantity, products.seuilAlerte),
                    lte(products.availableQuantity, 0)
                )
            ));

        for (const product of lowStockProducts) {
            const existing = await db
                .select()
                .from(notifications)
                .where(and(
                    eq(notifications.userId, userId),
                    eq(notifications.type, 'LOW_STOCK'),
                    eq(notifications.relatedEntityId, product.id),
                    eq(notifications.isRead, false)
                ))
                .limit(1);

            if (existing.length === 0) {
                const isRupture = product.availableQuantity <= 0;
                const [notif] = await db.insert(notifications).values({
                    userId,
                    type: 'LOW_STOCK',
                    title: isRupture ? 'Rupture de stock !' : 'Stock critique',
                    message: `${product.nom} (${product.reference || 'Sans réf'}): il reste ${product.availableQuantity} unités.`,
                    priority: isRupture ? 'HIGH' : 'MEDIUM',
                    relatedEntityType: 'product',
                    relatedEntityId: product.id,
                }).returning();
                alertsCreated.push(notif);
            }
        }

        if (alertsCreated.length > 0) {
            revalidatePath('/');
        }

        return { success: true, count: alertsCreated.length };
    } catch (error) {
        console.error('[syncBasicModeAlerts] Error:', error);
        throw error;
    }
});
