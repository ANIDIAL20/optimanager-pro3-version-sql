import * as React from 'react';
import { Suspense } from 'react';
import { getGlobalSupplierBalances } from '@/app/actions/supplier-orders-actions';
import { getSuppliersListPaginated } from '@/app/actions/supplier-actions';
import { requireAuth } from '@/lib/auth-helpers';

import { columns as supplierColumns } from '@/components/dashboard/fournisseurs/columns';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import { Plus, Truck, AlertTriangle } from 'lucide-react';
import { BulkReceiveModal } from '@/components/suppliers/BulkReceiveModal';
import Link from 'next/link';
import { SuppliersClientView } from './_components/suppliers-client-view';
import { SuppliersTableSkeleton } from './_components/suppliers-table-skeleton';
import { SensitiveData } from '@/components/ui/sensitive-data';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage({ 
  searchParams 
}: { 
  searchParams: Promise<Record<string, string>> | Record<string, string> 
}) {
  const user = await requireAuth();
  // Using Promise.resolve ensures we can await searchParams safely whether it's an object or a Promise (Next.js 15+ async searchParams)
  const awaitedParams = await Promise.resolve(searchParams);
  
  // Extract query parameters
  const search = awaitedParams.search || '';
  const category = (awaitedParams.category !== 'all' && awaitedParams.category) ? awaitedParams.category : undefined;
  const page = parseInt(awaitedParams.page || '1', 10) || 1;

  // Fetch paginated data for the current page
  // ✅ Direct call — auth() works normally in Server Components (no unstable_cache)
  const result = await getSuppliersListPaginated({
    search,
    category,
    page,
    limit: 20
  });

  // Fetch global metrics
  const globalData = await getGlobalSupplierBalances();
  let globalStats = { total_purchases: 0, total_debt: 0 };
  
  if (globalData?.success && globalData?.data) {
     globalStats = globalData.data;
  } else if (globalData && typeof globalData === 'object' && 'total_purchases' in globalData) {
     globalStats = globalData as any;
  }

  const { data: suppliers, totalCount, totalPages } = result;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      {/* Header - Standardized theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Fournisseurs
            </h1>
            <p className="text-slate-500 mt-1">
              Gérez votre réseau de partenaires et suivez vos approvisionnements.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <BulkReceiveModal />
          <Link href="/suppliers/new">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Fournisseur
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Fournisseurs</p>
              <h3 className="text-2xl font-bold text-slate-800">{totalCount}</h3>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(34, 197, 94, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Truck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Achats (TTC)</p>
              <h3 className="text-2xl font-bold text-slate-800">
                <SensitiveData value={globalStats.total_purchases} type="currency" />
              </h3>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(239, 68, 68, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Dettes</p>
              <h3 className="text-2xl font-bold text-red-600">
                <SensitiveData value={globalStats.total_debt} type="currency" />
              </h3>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Client-side search and filtering mapped over URL parameters + Main Table */}
      <Suspense fallback={<SuppliersTableSkeleton />}>
        <SuppliersClientView 
           initialData={suppliers} 
           columns={supplierColumns} 
           totalCount={totalCount}
           currentPage={page}
           totalPages={totalPages}
           initialSearch={search}
           initialCategory={category || 'all'}
        />
      </Suspense>
    </div>
  );
}
