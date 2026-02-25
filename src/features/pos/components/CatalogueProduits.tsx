'use client';

import * as React from 'react';
import { Package, Plus, Search } from 'lucide-react';

import type { Product } from '@/app/actions/products-actions';
import { getCategories, getProducts } from '@/app/actions/products-actions';

import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandLoader } from '@/components/ui/loader-brand';

import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';

export function CatalogueProduits() {
  const addItem = usePosCartStore((s) => s.addItem);
  const items = usePosCartStore((s) => s.items);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          getProducts(undefined),
          getCategories(),
        ]);

        if (cancelled) return;

        if (productsRes.success && productsRes.data) setProducts(productsRes.data);
        else setProducts([]);

        if (categoriesRes.success && categoriesRes.data) setCategories(categoriesRes.data);
        else setCategories([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = React.useMemo(() => {
    let filtered = products;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(
        (p) => p.category === activeCategory || p.categorie === activeCategory
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nomProduit?.toLowerCase().includes(q) ||
          p.reference?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.marque?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-lg px-3 py-1 bg-white">
          2
        </Badge>
        <h3 className="font-semibold text-lg">Catalogue Produits</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Rechercher un produit par nom ou référence..."
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
            onAdd={(p) => addItem(p as any)}
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
}: {
  products: Product[];
  isLoading: boolean;
  inCartProductIds: Set<string>;
  onAdd: (p: Product) => void;
}) {
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
        const isOutOfStock = product.isStockManaged ? product.quantiteStock <= 0 : false;

        return (
          <div
            key={product.id}
            className={cn(
              'flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow',
              isOutOfStock && 'opacity-50'
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Icon className="h-5 w-5 text-slate-600" />
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
              disabled={isOutOfStock}
              size="sm"
              variant={inCart ? 'secondary' : 'outline'}
              className="gap-2 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              {inCart ? 'Ajouté' : 'Ajouter'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
