'use client';

import * as React from 'react';
import { searchProducts, getCategories } from '@/app/actions/products-actions';
import { Search, Glasses, Sun, Shapes, Package, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BrandLoader } from '@/components/ui/loader-brand';
import { ClientLensesSection } from '@/components/pos/client-lenses-section';

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
    const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

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
                 const typeFilter = activeTab === 'Tout' ? undefined : (activeTab === 'Montures' ? 'MONTURE' : (activeTab === 'Accessoires' ? 'ACCESSOIRE' : activeTab));
                 
                 const res = await searchProducts({
                     query: debouncedSearchTerm,
                     type: typeFilter,
                     category: selectedCategory === 'all' ? undefined : selectedCategory,
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

    }, [debouncedSearchTerm, activeTab, selectedCategory]);

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Tabs */}
            <div className="flex gap-1 border-b pb-2 overflow-x-auto no-scrollbar">
                <TabButton label="Tout" active={activeTab === 'Tout'} onClick={() => setActiveTab('Tout')} icon={<Package className="h-3 w-3" />} />
                <TabButton label="Montures" active={activeTab === 'Montures'} onClick={() => setActiveTab('Montures')} icon={<Glasses className="h-3 w-3" />} />
                <TabButton label="Solaire" active={activeTab === 'SOLAIRE'} onClick={() => setActiveTab('SOLAIRE')} icon={<Sun className="h-3 w-3" />} />
                <TabButton label="Accessoires" active={activeTab === 'Accessoires'} onClick={() => setActiveTab('Accessoires')} icon={<Shapes className="h-3 w-3" />} />
                
                <TabButton 
                    label="Verres" 
                    active={activeTab === 'Verres'} 
                    onClick={() => setActiveTab('Verres')} 
                    badge={clientLenses.length > 0 ? clientLenses.length : undefined}
                    badgeVariant="success"
                    icon={<Eye className="h-3 w-3" />}
                />
            </div>

            {activeTab !== 'Verres' && (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher produit..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <SearchableSelect
                        options={[
                            { label: 'Toutes les catégories', value: 'all' },
                            ...categories.map(cat => ({ label: cat.name, value: cat.id }))
                        ]}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        placeholder="Catégorie"
                        searchPlaceholder="Filtre..."
                        className="w-[160px]"
                    />
                </div>
            )}

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

function TabButton({ label, active, badge, badgeVariant, onClick, icon }: any) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'px-3 py-2 relative flex items-center gap-2 text-sm font-medium transition-colors rounded-md',
          active ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        )}
      >
        {icon}
        {label}
        
        {/* Badge si disponible */}
        {badge ? (
          <span className={cn(
            'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
            badgeVariant === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-indigo-500 text-white'
          )}>
            {badge}
          </span>
        ) : null}
      </button>
    );
}
