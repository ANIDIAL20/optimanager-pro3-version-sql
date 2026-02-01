'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Minus, Trash2, Loader2, ShoppingCart, Package, Glasses, Eye, Box, Disc, SprayCan, Link as LinkIcon, Briefcase, Puzzle, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { cn } from '@/lib/utils';

// Server Actions
import { getProducts } from '@/app/actions/products-actions';
import { getCategories } from '@/app/actions/products-actions';
import { createSale } from '@/app/actions/sales-actions';

interface Client {
    id: string;
    nom: string;
    prenom: string;
}

interface ClientPOSTabProps {
    client: Client;
    clientId: string;
}

interface Product {
    id: string;
    nomProduit: string;
    reference?: string;
    categorie?: string;
    categorieId?: string;
    prixVente: number;
    quantiteStock: number;
}

interface Category {
    id: number;
    name: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

// Helper to get icon based on name (fuzzy match)
const getCategoryIconByName = (name: string = '') => {
    const normalize = (str: string) => str.toLowerCase();
    const n = normalize(name);

    if (n.includes('monture')) return Glasses;
    if (n.includes('verre')) return Disc;
    if (n.includes('lentille')) return Eye;
    if (n.includes('entretien')) return SprayCan;
    if (n.includes('cordons')) return LinkIcon;
    if (n.includes('etuis') || n.includes('étuis')) return Briefcase;
    if (n.includes('accessoire')) return Puzzle;
    if (n.includes('materiel') || n.includes('matériel')) return Wrench;

    return Package;
};

export function ClientPOSTab({ client, clientId }: ClientPOSTabProps) {
    const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
    const [products, setProducts] = React.useState<Product[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('all');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    const { toast } = useToast();
    const router = useRouter();

    // Load products and categories
    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Products
                const productsResult = await getProducts();
                if (productsResult.success && productsResult.data) {
                    setProducts(productsResult.data as any);
                }

                // Categories
                const categoriesResult = await getCategories();
                if (categoriesResult.success && categoriesResult.data) {
                    setCategories(categoriesResult.data as any);
                }

            } catch (error) {
                console.error('Error loading data:', error);
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: 'Impossible de charger les données.',
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Filter products
    const filteredProducts = React.useMemo(() => {
        let filtered = products;

        // Filter by category
        if (activeCategory !== 'all') {
            // ID match or fallback to name match
            filtered = filtered.filter(p => p.categorieId === activeCategory || p.categorieId === parseInt(activeCategory) || p.categorie === activeCategory);
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.nomProduit?.toLowerCase().includes(query) ||
                p.reference?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [products, activeCategory, searchQuery]);

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);
    const total = subtotal;

    // Add to cart
    const handleAddToCart = (product: Product) => {
        const existingIndex = cartItems.findIndex(item => item.product.id === product.id);

        if (existingIndex >= 0) {
            if (cartItems[existingIndex].quantity >= product.quantiteStock) {
                toast({
                    variant: 'destructive',
                    title: 'Stock insuffisant',
                    description: `Seulement ${product.quantiteStock} en stock.`,
                });
                return;
            }

            const newCart = [...cartItems];
            newCart[existingIndex].quantity += 1;
            setCartItems(newCart);
        } else {
            setCartItems([...cartItems, { product, quantity: 1 }]);
        }
    };

    // Update quantity
    const handleUpdateQuantity = (productId: string, delta: number) => {
        setCartItems(cartItems.map(item => {
            if (item.product.id === productId) {
                const newQuantity = item.quantity + delta;
                if (newQuantity < 1) return item;
                if (newQuantity > item.product.quantiteStock) {
                    toast({
                        variant: 'destructive',
                        title: 'Stock insuffisant',
                        description: `Seulement ${item.product.quantiteStock} en stock.`,
                    });
                    return item;
                }
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    // Remove from cart
    const handleRemoveItem = (productId: string) => {
        setCartItems(cartItems.filter(item => item.product.id !== productId));
    };

    // Validate order
    const handleValidateOrder = async () => {
        if (cartItems.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Panier vide',
                description: 'Ajoutez au moins un produit.',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const saleData = {
                clientId: clientId,
                items: cartItems.map(item => ({
                    productRef: item.product.id,
                    productName: item.product.nomProduit,
                    quantity: item.quantity,
                    unitPrice: item.product.prixVente,
                    total: item.product.prixVente * item.quantity,
                })),
                paymentMethod: 'cash',
                notes: `Vente POS pour ${client.prenom} ${client.nom}`
            };

            const result = await createSale(saleData);

            if (result.success) {
                toast({
                    title: 'Vente enregistrée !',
                    description: `Commande créée avec succès.`,
                });

                setCartItems([]);
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: result.error || 'Impossible de créer la commande.',
                });
            }

        } catch (error) {
            console.error('Error:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de créer la commande.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get icon for product category (Deprecated, used inline)
    const getCategoryIcon = (category: string) => {
        return Package;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Product Catalog (66%) */}
            <div className="lg:col-span-2 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher un produit par nom ou référence..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white"
                    />
                </div>

                {/* Category Tabs */}
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                    <TabsList className="w-full justify-start bg-white border h-auto flex-wrap gap-1 p-1">
                        {/* All Tab */}
                        <TabsTrigger value="all" className="gap-2">
                            <Package className="h-4 w-4" />
                            Tout
                        </TabsTrigger>

                        {/* Dynamic Tabs */}
                        {categories.map(cat => {
                            const Icon = getCategoryIconByName(cat.name);
                            return (
                                <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                                    <Icon className="h-4 w-4" />
                                    {cat.name}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-slate-400" />
                                <p className="text-sm text-slate-500">Chargement...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                <p className="font-medium">Aucun produit trouvé</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                {filteredProducts.map(product => {
                                    const Icon = getCategoryIconByName(product.categorie || '');
                                    const inCart = cartItems.find(item => item.product.id === product.id);
                                    const isOutOfStock = product.quantiteStock <= 0;

                                    return (
                                        <div
                                            key={product.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow",
                                                isOutOfStock && "opacity-50"
                                            )}
                                        >
                                            {/* Left: Icon + Name + Ref */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <Icon className="h-5 w-5 text-slate-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 truncate">
                                                        {product.nomProduit}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Réf: {product.reference || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Middle: Stock + Price */}
                                            <div className="flex items-center gap-4 mx-4">
                                                <Badge
                                                    variant={product.quantiteStock > 10 ? "outline" : product.quantiteStock > 0 ? "secondary" : "destructive"}
                                                    className="text-xs whitespace-nowrap"
                                                >
                                                    Stock: {product.quantiteStock}
                                                </Badge>
                                                <p className="text-base font-bold text-blue-600 whitespace-nowrap">
                                                    {product.prixVente} DH
                                                </p>
                                            </div>

                                            {/* Right: Add Button */}
                                            <Button
                                                onClick={() => handleAddToCart(product)}
                                                disabled={isOutOfStock}
                                                size="sm"
                                                variant={inCart ? "secondary" : "outline"}
                                                className="gap-2 whitespace-nowrap"
                                            >
                                                <Plus className="h-4 w-4" />
                                                {inCart ? `Ajouté (${inCart.quantity})` : 'Ajouter'}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {categories.map(cat => (
                        <TabsContent key={cat.id} value={cat.id} className="mt-4">
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                {filteredProducts.map(product => {
                                    const Icon = getCategoryIconByName(product.categorie || '');
                                    const inCart = cartItems.find(item => item.product.id === product.id);
                                    const isOutOfStock = product.quantiteStock <= 0;

                                    return (
                                        <div key={product.id} className={cn("flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow", isOutOfStock && "opacity-50")}>
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
                                                <Badge variant={product.quantiteStock > 10 ? "outline" : "secondary"} className="text-xs whitespace-nowrap">Stock: {product.quantiteStock}</Badge>
                                                <p className="text-base font-bold text-blue-600 whitespace-nowrap">{product.prixVente} DH</p>
                                            </div>
                                            <Button onClick={() => handleAddToCart(product)} disabled={isOutOfStock} size="sm" variant={inCart ? "secondary" : "outline"}>
                                                <Plus className="h-4 w-4" />
                                                {inCart ? `Ajouté (${inCart.quantity})` : 'Ajouter'}
                                            </Button>
                                        </div>
                                    )
                                })}
                                {filteredProducts.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                        <p className="font-medium">Aucun produit trouvé</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* RIGHT: Cart (33%) - Sticky */}
            <div className="lg:col-span-1">
                <Card className="sticky top-4 shadow-lg">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>Panier</span>
                            <Badge variant="secondary">{cartItems.length} article(s)</Badge>
                        </CardTitle>
                        <p className="text-xs text-slate-600 mt-1">
                            {client.prenom} {client.nom}
                        </p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {/* Cart Items */}
                        {cartItems.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <ShoppingCart className="h-12 w-12 mx-auto mb-2" />
                                <p className="text-sm">Panier vide</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {cartItems.map((item) => (
                                    <div key={item.product.id} className="flex gap-2 p-2 bg-slate-50 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {item.product.nomProduit}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {item.product.prixVente} DH × {item.quantity}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                onClick={() => handleUpdateQuantity(item.product.id, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="text-sm font-semibold w-6 text-center">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                onClick={() => handleUpdateQuantity(item.product.id, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-red-600 hover:bg-red-50"
                                                onClick={() => handleRemoveItem(item.product.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">
                                                {(item.product.prixVente * item.quantity).toFixed(2)} DH
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Separator />

                        {/* Totals */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Sous-total</span>
                                <span className="font-medium">
                                    <SensitiveData value={subtotal} type="currency" />
                                </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="font-bold text-slate-900">Total</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    <SensitiveData value={total} type="currency" />
                                </span>
                            </div>
                        </div>

                        {/* Validate Button */}
                        <Button
                            onClick={handleValidateOrder}
                            disabled={cartItems.length === 0 || isSubmitting}
                            className="w-full h-12 text-base font-semibold"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Valider la Vente
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
