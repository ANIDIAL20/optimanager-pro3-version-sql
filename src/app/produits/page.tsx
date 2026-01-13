'use client';

import * as React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns, type Product } from '@/components/dashboard/produits/columns';
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
import { getProducts, getCategories } from '@/features/products/actions';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      try {
        // 1. Fetch Products using server search if term exists, else all
        const productsData = await getProducts(searchTerm);
        
        // 2. Fetch Categories
        const categoriesData = await getCategories();

        if (isMounted) {
          // Map to Frontend Product Interface
          // New Architecture returns Drizzle entities { nom, prixVente (string), ... }
          // Frontend expects { nomProduit, prixVente (number), ... }
          const mappedProducts: Product[] = productsData.map((p: any) => ({
            id: p.id.toString(),
            reference: p.reference || '',
            nomProduit: p.nom,
            prixAchat: parseFloat(p.prixAchat || '0'),
            prixVente: parseFloat(p.prixVente || '0'),
            quantiteStock: p.quantiteStock || 0,
            stockMin: p.seuilAlerte || 5,
            categorie: p.categorie || '',
            marque: p.marque || '',
            description: p.description,
            // Legacy IDs not really needed if we use names, but keeping empty for safety
            categorieId: '',
            marqueId: ''
          }));

          setProducts(mappedProducts);
          setCategories(categoriesData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de charger les produits."
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    // Debounce search
    const timer = setTimeout(() => {
        fetchData();
    }, 300);

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [searchTerm, toast]);

  // Filter products by Category Tab
  const filteredProducts = React.useMemo(() => {
    if (categoryFilter === 'all') return products;
    return products.filter(p => p.categorie === categoryFilter);
  }, [products, categoryFilter]);

  // Stats
  const stats = React.useMemo(() => {
    return {
      total: products.length,
      lowStock: products.filter(p => p.quantiteStock < (p.stockMin || 5)).length,
      totalValue: products.reduce((acc, p) => acc + (p.prixVente * p.quantiteStock), 0),
    };
  }, [products]);

  if (isLoading && products.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock & Produits</h1>
          <p className="text-slate-600 mt-1">Gérez votre inventaire et vos produits</p>
        </div>
        <div className="flex gap-2">
          {/* Scanner uses Server Actions? Check comp */}
          <InvoiceScannerDialog /> 
          <Button asChild className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 shadow-md">
            <Link href="/produits/new">
              <Plus className="mr-2 h-4 w-4" />
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
            <h3 className="text-3xl font-bold text-slate-900">{stats.total}</h3>
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
          <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
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
                  // category.id IS category.name in new logic (mapped as {id: name, name: name})
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
      <DataTable
        columns={columns}
        data={filteredProducts}
        searchKey="reference"
        searchValue={searchTerm}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
