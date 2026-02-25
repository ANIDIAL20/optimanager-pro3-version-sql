'use client';

import * as React from "react";
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnreadReminderCount } from '@/app/actions/reminder-actions';

/**
 * Performance-Optimized Reminders Badge Component
 * Fixes performance violation by removing manual setInterval and dynamic imports
 * from the main thread execution path.
 */
export function RemindersBadge() {
    const pathname = usePathname();
    const queryClient = useQueryClient();

    // Use React Query for efficient, non-blocking background fetching and caching.
    // Replaces setInterval handler that was blocking the main thread.
    const { data: count = 0 } = useQuery({
        queryKey: ['reminders-count'],
        queryFn: async () => {
            try {
                // Top-level imported server action is already a lightweight proxy.
                return await getUnreadReminderCount();
            } catch (error) {
                console.error("Failed to fetch reminders count", error);
                return 0;
            }
        },
        // Revalidate in background every 60 seconds (Non-blocking)
        refetchInterval: 60000,
        // Consider data fresh for 30s to avoid redundant requests
        staleTime: 30000,
        // Avoid aggressive refetching on window focus to save resources
        refetchOnWindowFocus: false,
    });

    // Handle navigation-based refresh asynchronously to keep UI responsive.
    React.useEffect(() => {
        // This triggers a background refetch if stale, without blocking navigation.
        queryClient.invalidateQueries({ queryKey: ['reminders-count'] });
    }, [pathname, queryClient]);

    if (count <= 0) return null;

    return (
        <span 
            id="reminders-badge-count"
            className="absolute right-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm transition-all animate-in zoom-in-50"
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}
