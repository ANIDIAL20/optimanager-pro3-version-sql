'use client';

import * as React from 'react';
import { searchProducts, getCategories } from '@/app/actions/products-actions';
import { Search, Glasses, Sun, Shapes, Package, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BrandLoader } from '@/components/ui/loader-brand';
import { ClientLensesSection } from '@/components/pos/client-lenses-section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategoryIcon } from '@/lib/category-icons';

// Simple debounce hook implementation if not available
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

interface ProductSearchProps {
    onProductSelect: (product: Product) => void;
    clientLenses?: any[];
    onLensSelect?: (product: any, lensOrder: any) => void;
    addedLensIds?: string[];
}

export function ProductSearch({ onProductSelect, clientLenses = [], onLensSelect, addedLensIds = [] }: ProductSearchProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const debouncedSearchTerm = useDebounceValue(searchTerm, 400); // 400ms delay for better responsivenes
    const [products, setProducts] = React.useState<Product[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);
    
    // Filters
    const [activeTab, setActiveTab] = React.useState('Tout');

    // Load initial data (Categories & First Batch of Products)
    React.useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                // Parallel fetch
                const [catsRes, prodsRes] = await Promise.all([
                    getCategories(),
                    searchProducts({ limit: 50 })
                ]);

                if (catsRes.success && catsRes.data) {
                    setCategories(catsRes.data);
                }
                
                if (prodsRes.success && prodsRes.data) {
                    setProducts(prodsRes.data as Product[]);
                }
            } catch (error) {
                console.error("Failed to load initial POS data", error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    // ⚡ Trigger Search when filters change (Server-Side)
    React.useEffect(() => {
        const doSearch = async () => {
             // Avoid double fetch on initial mount as init() handles it, 
             // but cleaner to just let this effect run if we control the dependencies correctly.
             // We'll simplisticly set isLoading(true) to show feedback
             setIsLoading(true);
             try {
                 const res = await searchProducts({
                     query: debouncedSearchTerm,
                     type: undefined,
                     category: activeTab === 'Tout' ? undefined : (activeTab !== 'Verres' ? activeTab : undefined),
                     limit: 50 
                 });

                 if (res.success && res.data) {
                     setProducts(res.data as Product[]);
                 }
             } catch (err) {
                 console.error("Search error", err);
             } finally {
                 setIsLoading(false);
             }
        };

        // Skip effect on first render if we want, but debounce handles the rapid changes usually.
        // Actually, init() loads everything for 'Tout'. If activeTab changes, we need this.
        if (activeTab === 'Verres') return; // Verres handled by separate component

        doSearch();

    }, [debouncedSearchTerm, activeTab]);

    return (
        <div className="flex flex-col gap-4 h-full">
            {activeTab !== 'Verres' && (
                <div className="relative mb-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Rechercher un produit par nom ou référence..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-white h-14 rounded-xl border-slate-200 text-base shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                    />
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start bg-white border h-auto flex-wrap gap-1 p-1 rounded-xl">
                    <TabsTrigger value="Tout" className="gap-2">
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
                    <TabsTrigger value="Verres" className="gap-2 relative">
                        <Eye className="h-4 w-4" />
                        Verres Prêts
                        {clientLenses.length > 0 && (
                            <span className="ml-1 bg-green-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                                {clientLenses.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <ScrollArea className="flex-1 h-[400px] border rounded-md p-4 bg-slate-50/30">
                {activeTab === 'Verres' ? (
                    <ClientLensesSection 
                        lenses={clientLenses} 
                        onAddToCart={(p, lo) => onLensSelect && onLensSelect(p, lo)} 
                        addedLensIds={addedLensIds}
                    />
                ) : (
                    <>
                        {isLoading && (
                            <div className="flex justify-center items-center h-full">
                                <BrandLoader size="md" className="text-muted-foreground" />
                            </div>
                        )}

                        {!isLoading && products.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                Aucun produit trouvé pour ces critères.
                            </div>
                        )}

                        <div className="space-y-2">
                            {!isLoading && products.map((product) => (
                                <Card
                                    key={product.id}
                                    className={cn(
                                        "cursor-pointer hover:bg-white hover:shadow-sm transition-all border-slate-200",
                                        product.quantiteStock <= 0 && "opacity-60 bg-slate-100"
                                    )}
                                    onClick={() => {
                                        const available = product.type === 'MONTURE' ? (product.availableQuantity ?? product.quantiteStock) : product.quantiteStock;
                                        if (available > 0) {
                                            onProductSelect(product);
                                        }
                                    }}
                                >
                                    <CardContent className="p-3 flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold text-slate-800">{product.nomProduit}</div>
                                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1 font-normal text-slate-500 bg-slate-100">
                                                    {product.reference || '-'}
                                                </Badge>
                                                {product.type === 'MONTURE' ? (
                                                    <>
                                                        <span className={cn(
                                                            "font-medium",
                                                            (product.availableQuantity ?? product.quantiteStock) > 0 ? "text-emerald-600" : "text-red-500"
                                                        )}>
                                                            {(product.availableQuantity ?? product.quantiteStock) > 0 ? 'En Stock' : 'Épuisé'}
                                                        </span>
                                                        {product.reservedQuantity && product.reservedQuantity > 0 ? (
                                                            <span className="text-orange-600 font-medium text-[10px] flex items-center">
                                                                ({product.reservedQuantity} réservé{product.reservedQuantity > 1 ? 's' : ''})
                                                            </span>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <span className={cn(
                                                        product.quantiteStock > 0 ? "text-slate-600" : "text-destructive"
                                                    )}>
                                                        Stock: {product.quantiteStock}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-primary text-lg">{product.prixVente.toFixed(2)} <span className="text-xs font-normal text-slate-400">DH</span></div>
                                            {product.quantiteStock <= 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1">Rupture</Badge>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </ScrollArea>
        </div>
    );
}

