"use client";

import * as React from 'react';
import { Clock, AlertTriangle, Search } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { columns, SupplierOrderUI } from '@/components/dashboard/supplier-orders/columns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface SupplierOrdersTableProps {
    orders: SupplierOrderUI[];
}

export function SupplierOrdersTable({ orders }: SupplierOrdersTableProps) {
    const [activeTab, setActiveTab] = React.useState('all');
    const [searchTerm, setSearchTerm] = React.useState('');

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

    return (
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
                        <DataTable columns={columns} data={filteredOrders} />
                    </TabsContent>
                    <TabsContent value="pending" className="m-0">
                        <DataTable columns={columns} data={filteredOrders} />
                    </TabsContent>
                    <TabsContent value="unpaid" className="m-0">
                        <DataTable columns={columns} data={filteredOrders} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
