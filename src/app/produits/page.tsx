'use client';

import * as React from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
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
  Layers,
  Glasses,
  Disc,
  Eye,
  SprayCan,
  Link as LinkIcon,
  Briefcase,
  Puzzle
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { getCategoryIcon } from '@/lib/category-icons';
import { InvoiceScannerDialog } from '@/components/products/invoice-scanner-dialog';
import { getProducts } from '@/app/actions/products-actions';



export default function ProductsPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);

  // Fetch products via Server Action
  React.useEffect(() => {
    async function fetchProducts() {
      setIsLoadingProducts(true);
      try {
        const response = await getProducts(searchTerm);
        if (response.success && response.data) {
          setProducts(response.data);
        } else {
          console.error("Failed to fetch products:", response.error);
             // Optional: toast error
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    // Debounce search? For now, fetch on mount and maybe search button or simple debounce
    // But getProducts accepts search. If we want client-side filter (legacy behavior), we can fetch all then filter.
    // The previous code fetched all and filtered.
    // Let's stick to fetching all on mount, and client-side filter for now to match exact behavior, 
    // OR use the server-side search.
    // Previous code: `useCollection` (live).
    // Let's just fetch all (searchTerm empty) and filter client side to be safe/fast for small datasets, 
    // OR pass searchTerm to server.
    // The UI has a search input.
    // Let's pass valid search term if user stopped typing.
    const timer = setTimeout(() => {
        fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]); // Re-fetch on search change

  // Fetch brands (marques) - Keep Legacy Firebase for now
  const brandsQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, `stores/${user.uid}/marques`) : null,
    [firestore, user]
  );
  const { data: brands, isLoading: isLoadingBrands } = useCollection<{ id: string; name: string }>(brandsQuery);

  // Fetch categories
  const categoriesQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, `stores/${user.uid}/categories`) : null,
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<{ id: string; name: string }>(categoriesQuery);

  // Join logic simplified: The Server Action returns populated `marque` and `categorie` strings.
  // But we might want to enrich them if they are missing (legacy fallback).
  const processedProducts = React.useMemo(() => {
    if (!products) return [];
    
    return products.map(product => {
        // Use server-provided name, fallback to lookup if ID exists but name is empty
        const marqueName = product.marque || (product.marqueId && brands?.find(b => b.id === product.marqueId)?.name);
        const categoryName = product.categorie || (product.categorieId && categories?.find(c => c.id === product.categorieId)?.name);
        
        return {
            ...product,
            marque: marqueName,
            categorie: categoryName
        };
    });
  }, [products, brands, categories]);

  const isLoading = isLoadingProducts || isLoadingBrands || isLoadingCategories;

  // Filter products (Category tabs)
  const filteredProducts = React.useMemo(() => {
    if (!processedProducts) return [];
    return processedProducts.filter(product => {
      // Filter by category ID from tabs?
      // Tab values are category Ids (e.g. "cat_123") or "all".
      // Product might have `categorieId`.
      // If product only has `categorie` name, this filter breaks if tabs use IDs.
      // Tabs use `categories` from Firebase which have IDs.
      // If server action returns `categorieId` as 'legacy', we might have issue.
      // `products-actions.ts` returns `categorieId: 'legacy'`.
      // We need real IDs to filter by tabs.
      // Issue: Neon migration didn't map IDs perfectly? or `categorie` column stores name.
      // Migration script:
      // `const categorie = data.categorie || (data.categorieId && categoriesCache.get(data.categorieId)) || '';`
      // So Neon stores NAME.
      // Tabs use IDs.
      // WE NEED TO MATCH BY NAME then?
      // `categories` from Firebase has `{id, name}`.
      // We can find the Category ID for the product's Category Name.
      
      if (categoryFilter === 'all') return true;
      
      // Find selected category name
      const selectedCat = categories?.find(c => c.id === categoryFilter);
      if (!selectedCat) return false;
      
      // Compare names
      return product.categorie === selectedCat.name || product.categorieId === categoryFilter;
    });
  }, [processedProducts, categoryFilter, categories]);

  // Stats
  const stats = React.useMemo(() => {
    if (!processedProducts) return { total: 0, lowStock: 0, totalValue: 0 };
    return {
      total: processedProducts.length,
      lowStock: processedProducts.filter(p => p.quantiteStock < 10).length,
      totalValue: processedProducts.reduce((acc, p) => acc + (p.prixVente * p.quantiteStock), 0),
    };
  }, [processedProducts]);

  if (isLoading) {
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
                {categories?.map((category) => {
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
      <DataTable
        columns={columns}
        data={filteredProducts || []}
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
