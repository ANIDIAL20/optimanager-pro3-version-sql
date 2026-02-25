import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import type { DateRange } from '@/types/accounting';

export const getDateRange = (range: string): DateRange => {
    const now = new Date();
    switch (range) {
        case 'today':
            return { from: startOfDay(now), to: endOfDay(now) };
        case 'yesterday': {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
        }
        case 'thisMonth':
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case 'lastMonth': {
            const lastMonth = subMonths(now, 1);
            return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        }
        case 'thisYear':
            return { from: startOfYear(now), to: endOfYear(now) };
        default:
            return { from: startOfMonth(now), to: endOfMonth(now) };
    }
};
