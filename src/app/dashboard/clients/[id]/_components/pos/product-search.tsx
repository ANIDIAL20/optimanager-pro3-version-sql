'use client';

import * as React from 'react';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
// import { useDebounce } from '@/hooks/use-debounce'; // Assumption removed, inline used

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
    const firestore = useFirestore();
    const { user } = useFirebase();

    const productsQuery = useMemoFirebase(
        () => {
            if (!firestore || !user) return null;
            // Note: simple text search in Firestore is limited. 
            // Ideally we'd use Algolia or similar, but here we fetch all or filter client-side 
            // if the dataset is small, or use simple prefix matches if feasible.
            // For now, let's fetch all products and filter client-side for better UX on small datasets,
            // or rely on 'name >= term' for prefix search. 
            // Let's assume fetching all active products is okay for < 1000 items.
            return collection(firestore, `stores/${user.uid}/products`);
        },
        [firestore, user]
    );

    const { data: allProducts, isLoading } = useCollection<Product>(productsQuery);

    const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

    // Fetch categories for filter
    const categoriesQuery = useMemoFirebase(
        () => firestore && user ? collection(firestore, `stores/${user.uid}/categories`) : null,
        [firestore, user]
    );
    const { data: categories } = useCollection<{ id: string; name: string }>(categoriesQuery);

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
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className="flex-1 h-[400px] border rounded-md p-4">
                {isLoading && (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                                if (product.quantiteStock > 0) {
                                    onProductSelect(product);
                                }
                            }}
                        >
                            <CardContent className="p-3 flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{product.nomProduit}</div>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        <span>Réf: {product.reference || '-'}</span>
                                        <span className={cn(
                                            product.quantiteStock > 0 ? "text-green-600" : "text-destructive"
                                        )}>
                                            Stock: {product.quantiteStock}
                                        </span>
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
