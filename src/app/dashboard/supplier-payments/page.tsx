import { getSupplierPayments } from '@/app/actions/supplier-payments-actions';
import { columns } from '@/components/dashboard/supplier-payments/columns';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Wallet } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SupplierPaymentsPage() {
    const result = await getSupplierPayments();
    const payments = result.success ? result.payments : [];

    return (
        <div className="p-6 space-y-8">
            {/* Header - Standardized theme */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Règlements Fournisseurs</h1>
                        <p className="text-slate-500 mt-1">
                            Gérez vos règlements et suivez les échéances fournisseurs.
                        </p>
                    </div>
                </div>
                <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 gap-2">
                    <Link href="/dashboard/supplier-payments/new">
                        <Plus className="h-4 w-4" />
                        Nouveau Règlement
                    </Link>
                </Button>
            </div>

            <div className="bg-white rounded-lg border shadow-sm">
                <DataTable 
                    columns={columns} 
                    data={payments} 
                    searchKey="supplierName"
                />
            </div>
        </div>
    );
}
