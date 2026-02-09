'use client';

import * as React from "react";
import { usePathname } from 'next/navigation';

/**
 * Optimized Reminders Badge Component
 * Fetches unread count independently to avoid blocking main UI.
 */
export function RemindersBadge() {
    const [count, setCount] = React.useState(0);
    const pathname = usePathname();

    React.useEffect(() => {
        const fetchCount = async () => {
            try {
                // Dynamically import the action to keep bundle small and skip server-side execution if needed
                const { getUnreadReminderCount } = await import('@/app/actions/reminder-actions');
                const badgeCount = await getUnreadReminderCount();
                setCount(badgeCount);
            } catch (error) {
                console.error("Failed to fetch reminders count", error);
            }
        };

        fetchCount();

        // Refresh every minute
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, [pathname]); // Refresh on navigation to keep badge synced with "Mark as Read" actions

    if (count <= 0) return null;

    return (
        <span className="absolute right-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm transition-all animate-in zoom-in-50">
            {count > 99 ? '99+' : count}
        </span>
    );
}
