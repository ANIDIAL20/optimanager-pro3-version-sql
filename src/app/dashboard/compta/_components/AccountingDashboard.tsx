'use client';

import * as React from 'react';
import { ComptaClient } from './ComptaClient';
import { ExportsClient } from './ExportsClient';
import { getOfficialSalesAction, getHorsbilanSalesAction, getAllSalesAction } from '@/app/actions/accounting-actions';
import type { AccountingMetrics, SaleRow } from '@/types/accounting';
import { BrandLoader } from '@/components/ui/loader-brand';

interface AccountingDashboardProps {
    initialMetrics: AccountingMetrics | null;
    initialOfficial: SaleRow[];
    initialHorsbilan: SaleRow[];
    initialAll: SaleRow[];
}

export function AccountingDashboard({
    initialMetrics,
    initialOfficial,
    initialHorsbilan,
    initialAll
}: AccountingDashboardProps) {
    const [dateRange, setDateRange] = React.useState('thisMonth');
    const [officialSales, setOfficialSales] = React.useState<SaleRow[]>(initialOfficial);
    const [horsbilanSales, setHorsbilanSales] = React.useState<SaleRow[]>(initialHorsbilan);
    const [allSales, setAllSales] = React.useState<SaleRow[]>(initialAll);
    const [isSyncing, setIsSyncing] = React.useState(false);

    // Synchronize sales tables when dateRange changes
    React.useEffect(() => {
        // Skip initial mount as data is provided by server
        const syncData = async () => {
            setIsSyncing(true);
            try {
                const [offResult, hbResult, allResult] = await Promise.all([
                    getOfficialSalesAction(dateRange),
                    getHorsbilanSalesAction(dateRange),
                    getAllSalesAction(dateRange)
                ]);

                if (offResult.success) setOfficialSales(offResult.data || []);
                if (hbResult.success) setHorsbilanSales(hbResult.data || []);
                if (allResult.success) setAllSales(allResult.data || []);
            } catch (error) {
                console.error('Failed to sync accounting data:', error);
            } finally {
                setIsSyncing(false);
            }
        };

        syncData();
    }, [dateRange]);

    return (
        <div className="space-y-8 relative">
            {isSyncing && (
                <div className="absolute top-0 right-0 p-4 z-50">
                    <BrandLoader size="sm" />
                </div>
            )}
            
            <ComptaClient 
                initialMetrics={initialMetrics} 
                externalRange={dateRange} 
                onRangeChange={setDateRange} 
            />

            <ExportsClient
                officialSales={officialSales}
                horsbilanSales={horsbilanSales}
                allSales={allSales}
                dateRange={dateRange}
            />
        </div>
    );
}
