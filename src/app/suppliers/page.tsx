'use client';

import * as React from 'react';
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getGlobalSupplierBalances } from '@/app/actions/supplier-orders-actions';

import { columns as supplierColumns } from '@/components/dashboard/fournisseurs/columns';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Truck,
  Eye,
  Glasses,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { SuppliersClientView } from './_components/suppliers-client-view';
import { BrandLoader } from '@/components/ui/loader-brand';
import { SensitiveData } from '@/components/ui/sensitive-data';

export const dynamic = 'force-dynamic';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [globalStats, setGlobalStats] = React.useState({ total_purchases: 0, total_debt: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const [suppliersData, globalData] = await Promise.all([
          getSuppliersList(),
          getGlobalSupplierBalances()
        ]);

        // Handle secureActionWithResponse wrapper
        const suppliersList = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data || []);
        setSuppliers(suppliersList);

        if (globalData?.success && globalData?.data) {
          setGlobalStats(globalData.data);
        } else if (globalData && typeof globalData === 'object' && 'total_purchases' in globalData) {
          // Handle case where data is not wrapped
          setGlobalStats(globalData as any);
        }
      } catch (error) {
        console.error("Failed to fetch suppliers:", error);
        setSuppliers([]); // Ensure suppliers is always an array
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Calculate stats
  const stats = React.useMemo(() => ({
    total: suppliers.length,
    verres: suppliers.filter(s => s.category?.includes('Verres') || s.category?.includes('Lenses')).length,
    montures: suppliers.filter(s => s.category?.includes('Montures') || s.category?.includes('Frames')).length,
  }), [suppliers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <BrandLoader size="lg" />
      </div>
    );
  }

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

        <Link href="/suppliers/new">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md gap-2">
            <Plus className="h-4 w-4" />
            Nouveau Fournisseur
          </Button>
        </Link>
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
              <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
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

      {/* Client-side search and filtering */}
      <SuppliersClientView suppliers={suppliers} columns={supplierColumns} />
    </div>
  );
}
