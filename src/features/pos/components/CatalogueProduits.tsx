'use client';

import * as React from 'react';
import { Package, Plus, Search, Loader2, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import type { Product } from '@/app/actions/products-actions';
import { getCategories, getProducts } from '@/app/actions/products-actions';
import { getPendingLensOrders } from '@/app/actions/lens-orders-actions';
import { ClientLensesSection } from '@/components/pos/client-lenses-section';

import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandLoader } from '@/components/ui/loader-brand';

import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';
import { useInfiniteProducts } from '@/hooks/use-products';
import { useDebounce } from '@/hooks/use-debounce';

export function CatalogueProduits({ clientId, onCustomAdd }: { clientId?: number, onCustomAdd?: (p: any) => void } = {}) {
  const addItem = usePosCartStore((s) => s.addItem);
  const addLensOrder = usePosCartStore((s) => s.addLensOrder);
  const items = usePosCartStore((s) => s.items);
  const queryClient = useQueryClient();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [activeCategory, setActiveCategory] = React.useState('all');
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [clientLenses, setClientLenses] = React.useState<any[]>([]);

  // Fetch pending lenses if clientId is provided
  React.useEffect(() => {
    if (clientId) {
      // getPendingLensOrders expects a string; clientId is number here
      getPendingLensOrders(String(clientId)).then(res => {
        if (res.success && res.data) setClientLenses(res.data);
      });
    }
  }, [clientId]);

  // Fetch products seamlessly with infinite scrolling
  const { 
      data: infiniteData, 
      isLoading,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage
  } = useInfiniteProducts({ 
      query: debouncedSearch, 
      category: activeCategory !== 'all' ? activeCategory : undefined,
      limit: 20,
      hideOutOfStock: true, // 🛡️ POS: never show zero-stock managed products
      // 🔖 BUG-3 FIX: clientId is now number directly
      clientId: clientId,
  });

  // FIX 1: Listen for sale success to invalidate cache
  React.useEffect(() => {
    const handleSaleConfirmed = () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    window.addEventListener('sale-success', handleSaleConfirmed);
    return () => window.removeEventListener('sale-success', handleSaleConfirmed);
  }, [queryClient]);

  // FIX 5: Keyboard shortcut "/"
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const productsData = React.useMemo(() => {
     if (!infiniteData) return [];
     const allData = infiniteData.pages.flatMap(page => page.data);
     
     // De-duplicate items by ID to avoid React Key warnings (common in infinite scroll with changing counts)
     const seen = new Set();
     return allData.filter((p: any) => {
         if (!p?.id || seen.has(p.id)) return false;
         seen.add(p.id);
         return true;
     }) as Product[];
  }, [infiniteData]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const categoriesRes = await getCategories();
        if (cancelled) return;

        if (categoriesRes.success && categoriesRes.data) {
           // Provide fallback typing as per existing UI logic
           setCategories(categoriesRes.data as { id: string, name: string }[]);
        } else {
           setCategories([]);
        }
      } finally {
        // empty block
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = productsData as Product[]; // Filtering is already done server-side via hook

  return (
    <div className="space-y-4">
      {clientLenses.length > 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-700 font-semibold text-sm">
              👁️ {clientLenses.length} verre(s) prêt(s) à livrer
            </span>
          </div>
          <ClientLensesSection
            lenses={clientLenses}
            onAddToCart={(p, lo) => addLensOrder(lo)}
            addedLensIds={items.filter(i => i.productId.startsWith('LO-')).map(i => i.productId.replace('LO-', ''))}
          />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          ref={searchInputRef}
          placeholder="Rechercher un produit par nom ou référence... (appuyez sur /)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 bg-white h-14 rounded-xl border-slate-200 text-base shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all"
        />
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="w-full justify-start bg-white border h-auto flex-wrap gap-1 p-1 rounded-xl">
          <TabsTrigger value="all" className="gap-2">
            <Package className="h-4 w-4" />
            Tout
          </TabsTrigger>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {cat.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <ProductList
            products={filteredProducts}
            isLoading={isLoading}
            inCartProductIds={new Set(items.map((it) => it.productId))}
            onAdd={(p) => {
                if (onCustomAdd) onCustomAdd(p);
                else addItem(p as any);
            }}
            hasNextPage={!!hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductList({
  products,
  isLoading,
  inCartProductIds,
  onAdd,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage
}: {
  products: Product[];
  isLoading: boolean;
  inCartProductIds: Set<string>;
  onAdd: (p: Product) => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}) {
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // FIX 4: IntersectionObserver for auto infinite scroll
  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <BrandLoader size="md" className="mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
        <p className="font-medium">Aucun produit trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
      {products.map((product) => {
          const Icon = getCategoryIcon(product.category || product.categorie || '');
          const inCart = inCartProductIds.has(product.id);
          
          // FIX 2: Disable button when stock = 0 (excluding VERRE- products)
          const isStockDepleted = 
            !product.reference?.toUpperCase().startsWith('VERRE-') && 
            product.isStockManaged && 
            product.quantiteStock <= 0;

          return (
            <div
              key={product.id}
              className={cn(
                'flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow',
                isStockDepleted && 'opacity-60 grayscale-[0.5]'
              )}
            >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Icon className="h-5 w-5 text-slate-600" />
                {/* 🔴 Badge overlay when stock is 0 (shown only if hideOutOfStock is off) */}
                {isStockDepleted && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-500 fill-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{product.nomProduit}</p>
                <p className="text-xs text-slate-500">Réf: {product.reference || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mx-4">
              {product.isStockManaged && (
                <Badge
                  variant={
                    product.quantiteStock > 10
                      ? 'outline'
                      : product.quantiteStock > 0
                        ? 'secondary'
                        : 'destructive'
                  }
                  className="text-xs whitespace-nowrap"
                >
                  Stock: {product.quantiteStock}
                </Badge>
              )}
              <p className="text-base font-bold text-blue-600 whitespace-nowrap">
                {Number(product.prixVente).toFixed(2)} DH
              </p>
            </div>

            <Button
              onClick={() => onAdd(product)}
              disabled={isStockDepleted}
              title={isStockDepleted ? 'Stock épuisé' : undefined}
              size="sm"
              variant={inCart ? 'secondary' : 'outline'}
              className={cn(
                  "gap-2 whitespace-nowrap min-w-[100px]",
                  isStockDepleted && "border-red-200 text-red-500 bg-red-50"
              )}
            >
              {isStockDepleted ? (
                  'Épuisé'
              ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {inCart ? 'Ajouté' : 'Ajouter'}
                  </>
              )}
            </Button>
          </div>
        );
      })}
      
      {/* FIX 4: Sentinel for Infinite Scroll */}
      <div ref={loadMoreRef} className="h-12 w-full flex items-center justify-center p-4">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Chargement des produits...</span>
          </div>
        )}
      </div>
    </div>
  );
}
