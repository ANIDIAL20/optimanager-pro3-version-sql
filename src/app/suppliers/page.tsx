import * as React from 'react';
import { getSuppliersList } from '@/app/actions/supplier-actions';

import { DataTable } from '@/components/ui/data-table';
import { columns as supplierColumns } from '@/components/dashboard/fournisseurs/columns';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Truck,
  Eye,
  Glasses
} from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { SuppliersClientView } from './_components/suppliers-client-view';

export default async function SuppliersPage() {
  // Fetch suppliers on the server
  const suppliers = await getSuppliersList();

  // Calculate stats
  const stats = {
    total: suppliers.length,
    verres: suppliers.filter(s => s.category?.includes('Verres') || s.category?.includes('Lenses')).length,
    montures: suppliers.filter(s => s.category?.includes('Montures') || s.category?.includes('Frames')).length,
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fournisseurs</h2>
        <Link href="/suppliers/new">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Fournisseur
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Fournisseurs</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(34, 197, 94, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Fournisseurs Verres</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.verres}</h3>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(168, 85, 247, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Glasses className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Fournisseurs Montures</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.montures}</h3>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Client-side search and filtering */}
      <SuppliersClientView suppliers={suppliers} columns={supplierColumns} />
    </div>
  );
}
