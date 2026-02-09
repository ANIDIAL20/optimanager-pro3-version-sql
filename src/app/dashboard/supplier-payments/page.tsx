import { getSupplierPayments } from '@/app/actions/supplier-payments-actions';
import { columns } from '@/components/dashboard/supplier-payments/columns';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SupplierPaymentsPage() {
    const result = await getSupplierPayments();
    const payments = result.success ? result.payments : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Paiements Fournisseurs</h1>
                    <p className="text-slate-500 mt-2">
                        Gérez vos règlements et suivez les échéances.
                    </p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                    <Link href="/dashboard/supplier-payments/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau Paiement
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
