// NO 'use client' — pure async Server Component
import { startOfMonth } from 'date-fns';
import { requireUser } from '@/lib/auth-helpers';
import { getAccountingMetrics, getOfficialSales, getHorsbilanSales, getAllSales } from '@/app/actions/accounting-actions';
import { AccountingDashboard } from './_components/AccountingDashboard';
import type { DateRange } from '@/types/accounting';

export const metadata = {
    title: 'Exports & Rapports | OptiManager Pro',
};

export default async function ComptaPage() {
    const user = await requireUser();
    const userId = user.id;

    // Default range: current month
    const defaultRange: DateRange = {
        from: startOfMonth(new Date()),
        to: new Date(),
    };

    // Fetch all data in parallel — server-side, zero flash
    const [metricsResult, official, horsbilan, all] = await Promise.all([
        getAccountingMetrics('thisMonth'),
        getOfficialSales(userId, defaultRange),
        getHorsbilanSales(userId, defaultRange),
        getAllSales(userId, defaultRange),
    ]);

    const initialMetrics = metricsResult.success ? (metricsResult.data ?? null) : null;

    return (
        <div className="container mx-auto p-6 space-y-8">
            <AccountingDashboard
                initialMetrics={initialMetrics}
                initialOfficial={official}
                initialHorsbilan={horsbilan}
                initialAll={all}
            />
        </div>
    );
}
