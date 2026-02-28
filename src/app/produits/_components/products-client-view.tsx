'use client';

import * as React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns, type ProductWithRelations } from '@/components/dashboard/produits/columns';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';
import { InvoiceScannerDialog } from '@/components/products/invoice-scanner-dialog';
import { getCategories } from '@/app/actions/products-actions';
import { useProducts } from '@/hooks/use-products';
import { useToast } from '@/hooks/use-toast';

interface ProductsClientViewProps {
    initialProducts: ProductWithRelations[];
    initialCategories: { id: string, name: string }[];
    usageStats: { products: number, maxProducts: number };
}

export function ProductsClientView({ initialProducts, initialCategories, usageStats }: ProductsClientViewProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [categories, setCategories] = React.useState<{id: string, name: string}[]>(initialCategories);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 });

  const { toast } = useToast();

  React.useEffect(() => {
     const timer = setTimeout(() => {
         setDebouncedSearch(searchTerm);
         setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset page on search
     }, 400);
     return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: serverResult, isLoading } = useProducts(
      { query: debouncedSearch, page: pagination.pageIndex + 1, limit: pagination.pageSize, category: categoryFilter !== 'all' ? categoryFilter : undefined }, 
      debouncedSearch === '' && pagination.pageIndex === 0 && categoryFilter === 'all' ? { data: initialProducts, meta: { total: initialProducts.length, page: 1, limit: 15, totalPages: Math.ceil(initialProducts.length / 15) } } : undefined
  );
  
  const serverProducts = serverResult?.data || [];
  const meta = serverResult?.meta;
  
  const [optimisticProducts, addOptimisticProduct] = React.useOptimistic(
    serverProducts,
    (state, productId: string) => state.filter((p: any) => p.id.toString() !== productId)
  );

  const deleteProductLocally = (productId: string) => {
    addOptimisticProduct(productId);
  };

  // Sync props to state when Router refreshes
  React.useEffect(() => {
      setCategories(initialCategories);
  }, [initialCategories]);

  // Handle category change -> Reset page back to 1
  const handleCategoryChange = (val: string) => {
      setCategoryFilter(val);
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const filteredProducts = optimisticProducts;

  // Stats - NOTE: we are displaying stats for the CURRENT page + global total, since we don't fetch all.
  // Ideally stats should be passed from server independently if we want global lowStock counts,
  // but for now we'll do our best with meta.
  const stats = React.useMemo(() => {
    return {
      total: meta?.total || filteredProducts.length,
      lowStock: filteredProducts.filter((p: any) => p.quantiteStock < (p.stockMin || 5)).length,
      totalValue: filteredProducts.reduce((acc: number, p: any) => acc + (p.prixVente * p.quantiteStock), 0),
    };
  }, [filteredProducts, meta?.total]);

  return (
    <div className="space-y-6 p-6">
      {/* Header - Standardized theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Stock & Produits</h1>
            <p className="text-slate-500 mt-1">Gérez votre inventaire et vos produits en temps réel.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <InvoiceScannerDialog /> 
          <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200 gap-2">
            <Link href="/produits/new">
              <Plus className="h-4 w-4" />
              Nouveau Produit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Total Produits</p>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">
                {stats.total} <span className="text-sm text-slate-400 font-normal">/ {usageStats.maxProducts}</span>
            </h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                    className={cn("h-full rounded-full transition-all duration-500", 
                        (stats.total / usageStats.maxProducts) > 0.9 ? "bg-red-500" : "bg-blue-500"
                    )}
                    style={{ width: `${Math.min((stats.total / usageStats.maxProducts) * 100, 100)}%` }}
                />
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className={cn("p-6", stats.lowStock > 0 && "ring-2 ring-orange-500/50")} spotlightColor="rgba(249, 115, 22, 0.15)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Stock Faible</p>
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stats.lowStock > 0 ? "bg-orange-100" : "bg-slate-100")}>
                <AlertTriangle className={cn("h-4 w-4", stats.lowStock > 0 ? "text-orange-600" : "text-slate-500")} />
              </div>
            </div>
            <h3 className={cn("text-3xl font-bold", stats.lowStock > 0 ? "text-orange-600" : "text-slate-900")}>
              {stats.lowStock}
            </h3>
            <p className="text-xs text-slate-500">
              {stats.lowStock > 0 ? "Produits nécessitent réapprovisionnement" : "Stock normal"}
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Valeur Stock</p>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">
              {stats.totalValue.toFixed(0)} MAD
            </h3>
            <p className="text-xs text-slate-500">Valeur totale de l'inventaire</p>
          </div>
        </SpotlightCard>
      </div>

      {/* Search & Filter Bar */}
      <SpotlightCard className="p-4">
        <div className="flex flex-col gap-4">
          <Tabs value={categoryFilter} onValueChange={handleCategoryChange} className="w-full">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  className="pl-10 bg-white border-slate-200 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <TabsList className="bg-slate-100 p-1 h-auto flex-wrap justify-start">
                <TabsTrigger value="all" className="px-3 py-1.5 text-xs sm:text-sm">
                  <Layers className="mr-2 h-4 w-4" />
                  Tout
                </TabsTrigger>
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category.name);
                  return (
                    <TabsTrigger key={category.id} value={category.id} className="px-3 py-1.5 text-xs sm:text-sm">
                      <Icon className="mr-2 h-4 w-4" />
                      {category.name}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </Tabs>
        </div>
      </SpotlightCard>

      {/* Data Table */}
      {isLoading ? (
          <div className="flex justify-center p-8">
              <Skeleton className="h-96 w-full rounded-xl" />
          </div>
      ) : (
          <DataTable
            columns={columns}
            data={filteredProducts}
            manualPagination
            pageCount={meta?.totalPages || 1}
            pagination={pagination}
            onPaginationChange={setPagination}
            meta={{
                deleteProduct: deleteProductLocally
            }}
        />
      )}
    </div>
  );
}
