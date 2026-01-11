'use client';

import * as React from 'react';
import { Search, Plus, Minus, Glasses, Eye, Package as PackageIcon, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddProducts: (items: { product: Product; quantity: number }[]) => void;
}

const CATEGORIES = [
    { value: 'all', label: 'Tout' },
    { value: 'Monture', label: 'Montures' },
    { value: 'Verre', label: 'Verres' },
    { value: 'Lentille', label: 'Lentilles' },
    { value: 'Accessoire', label: 'Accessoires' },
];

export function ProductSelector({
    open,
    onOpenChange,
    onAddProducts,
}: ProductSelectorProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [allProducts, setAllProducts] = React.useState<Product[]>([]);
    // Local cart: productId -> quantity
    const [selectedItems, setSelectedItems] = React.useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = React.useState(false);
    const [activeCategory, setActiveCategory] = React.useState('all');
    const firestore = useFirestore();
    const { user } = useFirebase();

    // Load all products
    React.useEffect(() => {
        const loadProducts = async () => {
            if (!firestore || !user || !open) return;

            setIsLoading(true);
            try {
                const productsRef = collection(firestore, `stores/${user.uid}/products`);
                const snapshot = await getDocs(productsRef);
                const products = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Product));
                setAllProducts(products);
            } catch (error) {
                console.error('Error loading products:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProducts();
    }, [firestore, user, open]);

    // Reset cart when dialog closes
    React.useEffect(() => {
        if (!open) {
            setSelectedItems({});
            setSearchQuery('');
        }
    }, [open]);

    // Filter products
    const filteredProducts = React.useMemo(() => {
        let filtered = allProducts;

        if (activeCategory !== 'all') {
            filtered = filtered.filter(p => p.categorie === activeCategory);
        }

        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.nomProduit?.toLowerCase().includes(searchLower) ||
                p.reference?.toLowerCase().includes(searchLower) ||
                p.marque?.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [allProducts, activeCategory, searchQuery]);

    // Calculate cart summary
    const cartSummary = React.useMemo(() => {
        const items = Object.entries(selectedItems).filter(([_, qty]) => qty > 0);
        const totalItems = items.reduce((sum, [_, qty]) => sum + qty, 0);
        const totalPrice = items.reduce((sum, [productId, qty]) => {
            const product = allProducts.find(p => p.id === productId);
            return sum + (product?.prixVente || 0) * qty;
        }, 0);

        return { count: items.length, totalItems, totalPrice };
    }, [selectedItems, allProducts]);

    // Handle quantity change
    const updateQuantity = (productId: string, newQty: number, maxStock: number) => {
        setSelectedItems(prev => {
            const safeQty = Math.max(0, Math.min(newQty, maxStock));
            if (safeQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: safeQty };
        });
    };

    // Add to cart
    const handleAddToCart = () => {
        const items = Object.entries(selectedItems)
            .filter(([_, qty]) => qty > 0)
            .map(([productId, qty]) => {
                const product = allProducts.find(p => p.id === productId)!;
                return { product, quantity: qty };
            });

        if (items.length > 0) {
            onAddProducts(items);
            setSelectedItems({});
            onOpenChange(false);
        }
    };

    const getStockColor = (stock: number) => {
        if (stock === 0) return 'text-red-600 bg-red-50 border-red-200';
        if (stock < 3) return 'text-orange-600 bg-orange-50 border-orange-200';
        if (stock < 10) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-green-600 bg-green-50 border-green-200';
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Monture':
                return <Glasses className="h-6 w-6 text-slate-600" />;
            case 'Verre':
            case 'Lentille':
                return <Eye className="h-6 w-6 text-slate-600" />;
            default:
                return <PackageIcon className="h-6 w-6 text-slate-600" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
                {/* FIXED HEADER */}
                <div className="p-6 pb-4 border-b bg-white">
                    <DialogHeader className="mb-4">
                        <DialogTitle>Ajouter des Produits</DialogTitle>
                        <DialogDescription>
                            Sélectionnez plusieurs produits avec leurs quantités puis ajoutez-les au panier
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Rechercher par nom, référence ou marque..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Category Tabs */}
                    <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                        <TabsList className="grid w-full grid-cols-5">
                            {CATEGORIES.map((cat) => (
                                <TabsTrigger key={cat.value} value={cat.value}>
                                    {cat.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-slate-500">Chargement des produits...</p>
                            </div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <PackageIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">Aucun produit trouvé</p>
                                <p className="text-sm text-slate-400 mt-1">Essayez de modifier vos filtres</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredProducts.map((product) => {
                                const quantity = selectedItems[product.id] || 0;
                                const isSelected = quantity > 0;
                                const maxStock = product.quantiteStock || 0;

                                return (
                                    <div
                                        key={product.id}
                                        className={cn(
                                            'p-4 rounded-lg border-2 transition-all',
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                : 'border-slate-200'
                                        )}
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            {/* Icon */}
                                            <div className={cn(
                                                "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
                                                isSelected ? 'bg-blue-100' : 'bg-slate-100'
                                            )}>
                                                {getCategoryIcon(product.categorie || '')}
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                {product.marque && (
                                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                                        {product.marque}
                                                    </p>
                                                )}
                                                <p className="font-semibold text-slate-900 mt-0.5 line-clamp-1">
                                                    {product.nomProduit}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Réf: {product.reference}
                                                </p>
                                            </div>

                                            {/* Remove button if selected */}
                                            {isSelected && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                    onClick={() => updateQuantity(product.id, 0, maxStock)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Price and Stock */}
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-lg font-bold text-blue-600">
                                                {product.prixVente?.toFixed(2)} MAD
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className={cn('text-xs font-semibold', getStockColor(maxStock))}
                                            >
                                                Stock: {maxStock}
                                            </Badge>
                                        </div>

                                        {/* Quantity Controls */}
                                        {quantity === 0 ? (
                                            <Button
                                                onClick={() => updateQuantity(product.id, 1, maxStock)}
                                                disabled={maxStock === 0}
                                                className="w-full"
                                                variant="outline"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Ajouter
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => updateQuantity(product.id, quantity - 1, maxStock)}
                                                    className="h-9 w-9"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={quantity}
                                                    onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0, maxStock)}
                                                    className="text-center h-9 font-semibold"
                                                    min="1"
                                                    max={maxStock}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => updateQuantity(product.id, quantity + 1, maxStock)}
                                                    disabled={quantity >= maxStock}
                                                    className="h-9 w-9"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                <div className="ml-auto text-right">
                                                    <p className="text-sm font-bold text-blue-600">
                                                        {(product.prixVente * quantity).toFixed(2)} MAD
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* STICKY FOOTER */}
                <div className="border-t bg-white p-6">
                    {cartSummary.count > 0 ? (
                        <div className="flex items-center justify-between">
                            {/* Summary */}
                            <div>
                                <p className="text-sm text-slate-600">
                                    {cartSummary.count} produit{cartSummary.count > 1 ? 's' : ''} sélectionné{cartSummary.count > 1 ? 's' : ''}
                                    {' '}({cartSummary.totalItems} article{cartSummary.totalItems > 1 ? 's' : ''})
                                </p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">
                                    {cartSummary.totalPrice.toFixed(2)} MAD
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedItems({})}
                                >
                                    Réinitialiser
                                </Button>
                                <Button
                                    onClick={handleAddToCart}
                                    size="lg"
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Ajouter la sélection ({cartSummary.count})
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-4">
                            <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">Cliquez sur "Ajouter" pour sélectionner des produits</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
