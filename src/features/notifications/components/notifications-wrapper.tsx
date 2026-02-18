'use client';

import * as React from 'react';
import { NotificationsPopover } from './notifications-popover';
import { getRecentNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notification-actions';
import type { Notification } from '@/db/schema';

export function NotificationsWrapper() {
    const [notifications, setNotifications] = React.useState<Notification[]>([]);

    const loadNotifications = React.useCallback(async () => {
        const res = await getRecentNotifications();
        if (res.success && res.data) {
            setNotifications(res.data as Notification[]);
        }
    }, []);

    React.useEffect(() => {
        loadNotifications();
        // Refresh every 5 minutes
        const interval = setInterval(loadNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    const handleMarkAsRead = async (id: number) => {
        const res = await markNotificationAsRead(id);
        if (res.success) {
            loadNotifications();
        }
    };

    const handleMarkAllAsRead = async () => {
        const res = await markAllNotificationsAsRead();
        if (res.success) {
            loadNotifications();
        }
    };

    return (
        <NotificationsPopover
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
        />
    );
}
