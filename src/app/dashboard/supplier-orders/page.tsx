'use client';

import * as React from 'react';
import {
    getSupplierOrders,
    SupplierOrder,
} from '@/app/actions/supplier-orders-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Truck, Plus, Package, AlertTriangle, Euro, Search, Clock } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { columns, SupplierOrderUI } from '@/components/dashboard/supplier-orders/columns';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { SensitiveData } from '@/components/ui/sensitive-data';

export default function SupplierOrdersPage() {
    const { toast } = useToast();

    const [orders, setOrders] = React.useState<SupplierOrderUI[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('all');
    const [searchTerm, setSearchTerm] = React.useState('');

    // Load orders
    const loadOrders = React.useCallback(async () => {
        setIsLoading(true);
        const result = await getSupplierOrders();
        if (result.success) {
            // Cast to UI type and default amountPaid if missing
            const uiOrders = result.orders.map(o => ({
                ...o,
                amountPaid: (o as any).amountPaid || 0
            }));
            setOrders(uiOrders);
        }
        setIsLoading(false);
    }, []);

    React.useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // Compute Stats
    const stats = React.useMemo(() => {
        const total = orders.length;
        const pending = orders.filter(o => o.status !== 'received').length;
        const unpaid = orders.reduce((acc, o) => {
            const debt = (o.totalAmount || 0) - (o.amountPaid || 0);
            return acc + (debt > 0 ? debt : 0);
        }, 0);
        return { total, pending, unpaid };
    }, [orders]);

    // Filter Logic
    const filteredOrders = React.useMemo(() => {
        let filtered = orders;

        // Search
        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase();
            filtered = filtered.filter(o =>
                o.supplierName.toLowerCase().includes(lowerInfo) ||
                (o.supplierPhone || '').includes(lowerInfo)
            );
        }

        // Tabs
        if (activeTab === 'pending') {
            filtered = filtered.filter(o => o.status !== 'received');
        } else if (activeTab === 'unpaid') {
            filtered = filtered.filter(o => ((o.totalAmount || 0) - (o.amountPaid || 0)) > 0.01);
        }

        return filtered;
    }, [orders, activeTab, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Truck className="h-8 w-8 text-primary" />
                        Commandes Fournisseurs
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Suivez vos achats, réceptions et dettes fournisseurs.
                    </p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle Commande
                </Button>
            </div>

            {/* KPI Cards */}
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

            {/* Tabs & Filters */}
            <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <TabsList className="bg-white border p-1 h-auto">
                            <TabsTrigger value="all" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 px-4 py-2">
                                Toutes
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 px-4 py-2">
                                <Clock className="h-3 w-3 mr-2" />
                                En attente
                            </TabsTrigger>
                            <TabsTrigger value="unpaid" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700 px-4 py-2">
                                <AlertTriangle className="h-3 w-3 mr-2" />
                                Impayés
                            </TabsTrigger>
                        </TabsList>

                        {/* Global Search */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Rechercher fournisseur..."
                                className="pl-9 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-4 bg-white rounded-xl border shadow-sm overflow-hidden">
                        <TabsContent value="all" className="m-0">
                            <DataTable columns={columns} data={filteredOrders} searchKey="supplierName" />
                        </TabsContent>
                        <TabsContent value="pending" className="m-0">
                            <DataTable columns={columns} data={filteredOrders} searchKey="supplierName" />
                        </TabsContent>
                        <TabsContent value="unpaid" className="m-0">
                            <DataTable columns={columns} data={filteredOrders} searchKey="supplierName" />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
