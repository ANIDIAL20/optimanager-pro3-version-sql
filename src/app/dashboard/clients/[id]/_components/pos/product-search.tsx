'use client';

import * as React from 'react';
import { getProducts } from '@/app/actions/products-actions';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
// import { useDebounce } from '@/hooks/use-debounce'; // Assumption removed, inline used
import { BrandLoader } from '@/components/ui/loader-brand';

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
}

export function ProductSearch({ onProductSelect }: ProductSearchProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const debouncedSearchTerm = useDebounceValue(searchTerm, 500);
    const [allProducts, setAllProducts] = React.useState<Product[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);

    // Load products on mount
    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const result = await getProducts();
                if (result.success && result.data) {
                    setAllProducts(result.data as Product[]);
                    
                    // Extract unique categories
                    const uniqueCategories = [...new Set(result.data.map(p => p.categorie).filter(Boolean))];
                    setCategories(uniqueCategories.map(cat => ({ id: cat, name: cat })));
                }
            } catch (error) {
                console.error('Error loading products:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

    const filteredProducts = React.useMemo(() => {
        if (!allProducts) return [];
        // if (!debouncedSearchTerm) return allProducts.slice(0, 10); // Logic replaced to support category filter even if search is empty

        const lowerTerm = debouncedSearchTerm.toLowerCase();

        return allProducts.filter(p => {
            const matchesSearch = !lowerTerm ||
                p.nomProduit.toLowerCase().includes(lowerTerm) ||
                p.reference?.toLowerCase().includes(lowerTerm);

            const matchesCategory = selectedCategory === 'all' || p.categorieId === selectedCategory;

            return matchesSearch && matchesCategory;
        }).slice(0, 20); // Limit output for performance
    }, [allProducts, debouncedSearchTerm, selectedCategory]);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom ou référence..."
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
                    searchPlaceholder="Rechercher une catégorie..."
                    className="w-[180px]"
                />
            </div>

            <ScrollArea className="flex-1 h-[400px] border rounded-md p-4">
                {isLoading && (
                    <div className="flex justify-center items-center h-full">
                        <BrandLoader size="md" className="text-muted-foreground" />
                    </div>
                )}

                {!isLoading && filteredProducts.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        Aucun produit trouvé.
                    </div>
                )}

                <div className="space-y-2">
                    {filteredProducts.map((product) => (
                        <Card
                            key={product.id}
                            className={cn(
                                "cursor-pointer hover:bg-accent transition-colors",
                                product.quantiteStock <= 0 && "opacity-60"
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
                                    <div className="font-medium">{product.nomProduit}</div>
                                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                                        <span>Réf: {product.reference || '-'}</span>
                                        {product.type === 'MONTURE' ? (
                                            <>
                                                <span className="text-slate-500">Stock: {product.quantiteStock}</span>
                                                {product.reservedQuantity && product.reservedQuantity > 0 ? (
                                                    <span className="text-orange-600 font-medium">({product.reservedQuantity} réservé{product.reservedQuantity > 1 ? 's' : ''})</span>
                                                ) : null}
                                                <span className={cn(
                                                    (product.availableQuantity ?? product.quantiteStock) > 0 ? "text-emerald-600 font-bold" : "text-destructive font-bold"
                                                )}>
                                                    Disp: {product.availableQuantity ?? product.quantiteStock}
                                                </span>
                                            </>
                                        ) : (
                                            <span className={cn(
                                                product.quantiteStock > 0 ? "text-green-600" : "text-destructive"
                                            )}>
                                                Stock: {product.quantiteStock}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">{product.prixVente.toFixed(2)} MAD</div>
                                    {product.quantiteStock <= 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1">Épuisé</Badge>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
