'use server';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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
