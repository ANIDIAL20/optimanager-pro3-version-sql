"use client";

import { Package, AlertTriangle, Clock } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SensitiveData } from '@/components/ui/sensitive-data';

interface SupplierOrdersStatsProps {
    stats: {
        total: number;
        pending: number;
        unpaid: number;
    };
}

export function SupplierOrdersStats({ stats }: SupplierOrdersStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SpotlightCard className="bg-white border-slate-200/60 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Commandes</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                    </div>
                </div>
            </SpotlightCard>

            <SpotlightCard className="bg-white border-slate-200/60 shadow-sm" from="red">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-xl">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Montant Impayé</p>
                        <div className="text-2xl font-bold text-red-600">
                            <SensitiveData value={stats.unpaid} type="currency" />
                        </div>
                    </div>
                </div>
            </SpotlightCard>

            <SpotlightCard className="bg-white border-slate-200/60 shadow-sm" from="orange">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-xl">
                        <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Réception En Attente</p>
                        <h3 className="text-2xl font-bold text-orange-600">{stats.pending}</h3>
                    </div>
                </div>
            </SpotlightCard>
        </div>
    );
}
