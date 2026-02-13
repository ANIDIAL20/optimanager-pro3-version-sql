'use server';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { revalidatePath } from 'next/cache';

/**
 * Fetch recent notifications for the user
 */
export const getRecentNotifications = secureAction(async (userId, user) => {
    try {
        const results = await db.query.notifications.findMany({
            where: eq(notifications.userId, userId),
            orderBy: [desc(notifications.createdAt)],
            limit: 20
        });

        return { success: true, data: results };
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = secureAction(async (userId, user, notificationId: number) => {
    try {
        await db.update(notifications)
            .set({ isRead: true, readAt: new Date() })
            .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
        
        revalidatePath('/'); // Global refresh might be needed for the badge
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = secureAction(async (userId, user) => {
    try {
        await db.update(notifications)
            .set({ isRead: true, readAt: new Date() })
            .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
        
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});
