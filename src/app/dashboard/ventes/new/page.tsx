'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Client, Product } from '@/lib/types'; // Uses legacy Client? We need to adapt.
import { Cart } from '@/app/clients/[id]/_components/pos/cart'; // Unused?
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    Receipt,
    Search,
    Loader2,
    Package,
    Plus,
    ShoppingCart,
    Minus,
    Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { ClientSelector } from '@/components/sales/client-selector';
import { QuickClientDialog } from '@/components/sales/quick-client-dialog';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';
import { PaymentSection } from '@/app/clients/[id]/_components/pos/payment-section';

// Server Actions
// Server Actions - NEW Architecture
import { getClients } from '@/features/clients/actions';
import { getProducts, getCategories, type Product as ActionProduct } from '@/app/actions/products-actions'; // Still using this for POS products 
import { createSale } from '@/features/sales/actions';

// Use CartItem type definition
interface CartItem {
    product: Product;
    quantity: number;
}


export default function NewSalePage() {
    const router = useRouter();
    const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
    const [products, setProducts] = React.useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('all');
    const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);

    // const firestore = useFirestore(); // Removed
    // const { user } = useFirebase(); // Removed
    const { toast } = useToast();

    // Fetch clients for selector
    const [clients, setClients] = React.useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = React.useState(true);
    const [categories, setCategories] = React.useState<{ id: string, name: string }[]>([]);

    React.useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                // 1. Clients
                const clientsRes = await getClients(undefined);
                if (isMounted) {
                    // New getClients returns Client[] directly
                    if (Array.isArray(clientsRes)) {
                        // Adapt clients to legacy interface
                        const adaptedClients: any[] = clientsRes.map(c => {
                            const fullName = c.fullName || c.name || '';
                            const nameParts = fullName.split(' ');
                            const prenom = nameParts.length > 1 ? nameParts[0] : '';
                            const nom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : fullName;
                            return {
                                ...c,
                                id: c.id.toString(), // Convert number to string for UI
                                name: fullName,      // Ensure name property exists
                                nom,
                                prenom,
                                telephone1: c.phone || '',
                            };
                        });
                        setClients(adaptedClients);
                    }
                    setIsLoadingClients(false);
                }

                // 2. Products
                setIsLoadingProducts(true);
                const productsRes = await getProducts(undefined);
                if (isMounted) {
                    if (productsRes.success && productsRes.data) {
                        // Map ActionProduct to local Product (legacy)
                        // ActionProduct has id, name, etc. Legacy Product has nomProduit, reference...
                        const mapped: Product[] = productsRes.data.map(p => ({
                             id: p.id,
                             reference: p.reference,
                             nomProduit: p.nomProduit,
                             prixAchat: p.prixAchat || 0,
                             prixVente: p.prixVente,
                             quantiteStock: p.quantiteStock,
                             stockMin: p.seuilAlerte,
                             categorieId: p.categorieId || '', // Legacy
                             marqueId: p.marqueId || '', // Legacy
                             categorie: p.categorie,
                             marque: p.marque,
                             description: p.description
                             // missing others but enough for POS
                        }));
                        setProducts(mapped);
                    }
                     setIsLoadingProducts(false);
                }

                // 3. Categories
                const catRes = await getCategories();
                if (isMounted && catRes.success && catRes.data) {
                    setCategories(catRes.data);
                }

            } catch (err) {
                console.error("Error loading POS data", err);
                toast({ title: "Erreur de chargement", variant: "destructive", description: "Veuillez rafraîchir la page." });
            }
        }
        loadData();

        return () => { isMounted = false; };
    }, [toast]);

    // Filter Logic from ClientPOSTab
    const filteredProducts = React.useMemo(() => {
        let filtered = products;

        if (activeCategory !== 'all') {
            // Filter by ID match OR Name match (since we mapped distinct names to IDs in getCategories)
            // getCategories returned { id: 'Lunettes', name: 'Lunettes' }
            filtered = filtered.filter(p => p.categorie === activeCategory || p.categorieId === activeCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.nomProduit?.toLowerCase().includes(query) ||
                p.reference?.toLowerCase().includes(query)
            );
        }
        return filtered;
    }, [products, activeCategory, searchQuery]);

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

    const handleRemoveItem = (productId: string) => {
        setCartItems(cartItems.filter(item => item.product.id !== productId));
    };

    const clearCart = () => setCartItems([]);

    const handleProcessSale = async (paymentData: { amountPaid: number; method: string; notes: string }) => {
        if (cartItems.length === 0) {
            toast({ title: "Panier vide", description: "Ajoutez au moins un produit.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);

        try {
            // Prepare items for Server Action
            // Prepare items matching saleItemSchema
            const saleItems = cartItems.map(item => ({
                productId: item.product.id,
                name: item.product.nomProduit,
                quantity: item.quantity,
                price: item.product.prixVente,
                total: item.product.prixVente * item.quantity
            }));

            // Client ID handling (ensure number)
            const clientIdNum = selectedClient?.id ? parseInt(selectedClient.id) : undefined;

            // Calculate Totals
            const totalTTC = cartItems.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);
            const totalHT = totalTTC / 1.2; // Assuming 20% TVA for simplicity as default
            const totalTVA = totalTTC - totalHT;
            
            // Call New Feature Action
            const result = await createSale({
                clientId: clientIdNum,
                clientName: selectedClient?.name,
                items: saleItems,
                
                // Financials (Required by Zod Schema)
                totalHT: parseFloat(totalHT.toFixed(2)),
                totalTVA: parseFloat(totalTVA.toFixed(2)),
                totalTTC: parseFloat(totalTTC.toFixed(2)),
                totalPaid: paymentData.amountPaid,
                
                paymentMethod: paymentData.method.toUpperCase() as any,
                notes: paymentData.notes,
                status: paymentData.amountPaid >= totalTTC ? 'PAYE' : paymentData.amountPaid > 0 ? 'PARTIEL' : 'IMPAYE'
            });

            if (result && (result as any).id) {
                 toast({ title: "✅ Vente réussie !", description: "La vente a été enregistrée avec succès." });
                 clearCart();
                 // New architecture returns object, legacy might have returned success bool. 
                 // Our createSale returns the Sale object directly or throws? 
                 // createAction wrapper returns the result of the handler.
                 // Handler returns newSale.
                 router.push(`/dashboard/ventes/${(result as any).id}`);
            } else {
                 throw new Error("Réponse invalide du serveur");
            }

        } catch (error: any) {
            console.error("Sale Error:", error);
            toast({ title: "❌ Erreur", description: "Impossible d'enregistrer la vente. " + error?.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const total = cartItems.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/ventes">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Receipt className="h-8 w-8" />
                            Nouvelle Vente
                        </h1>
                        <p className="text-muted-foreground">Point de vente professionnel</p>
                    </div>
                </div>
            </div>

            {/* Step 1: Client */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1 bg-white">1</Badge>
                    <h3 className="font-semibold text-lg">Identification du Client</h3>
                </div>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex gap-4 items-start">
                            <div className="flex-1 max-w-2xl">
                                {isLoadingClients ? (
                                    <div className="h-10 bg-slate-200 animate-pulse rounded" />
                                ) : (
                                    <ClientSelector
                                        clients={clients}
                                        selectedClient={selectedClient}
                                        onSelectClient={setSelectedClient}
                                        onCreateNew={() => { }}
                                    />
                                )}
                            </div>
                            <div className="pt-0.5">
                                <QuickClientDialog onClientCreated={setSelectedClient} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Step 2 & 3: POS Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT: Product Catalog */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-lg px-3 py-1 bg-white">2</Badge>
                        <h3 className="font-semibold text-lg">Catalogue Produits</h3>
                    </div>

                    {/* Search */}
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
                            <TabsTrigger value="all" className="gap-2">
                                <Package className="h-4 w-4" />
                                Tout
                            </TabsTrigger>
                            {categories.map(cat => {
                                const Icon = getCategoryIcon(cat.name);
                                return (
                                    <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                                        <Icon className="h-4 w-4" />
                                        {cat.name}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        <TabsContent value="all" className="mt-4">
                             <ProductList
                                products={filteredProducts}
                                isLoading={isLoadingProducts}
                                cartItems={cartItems}
                                onAdd={handleAddToCart}
                             />
                        </TabsContent>

                        {categories.map(cat => (
                            <TabsContent key={cat.id} value={cat.id} className="mt-4">
                                <ProductList
                                    products={filteredProducts}
                                    isLoading={isLoadingProducts}
                                    cartItems={cartItems}
                                    onAdd={handleAddToCart}
                                />
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>

                {/* RIGHT: Cart */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-lg px-3 py-1 bg-white">3</Badge>
                        <h3 className="font-semibold text-lg">Encaissement</h3>
                    </div>

                    <Card className="sticky top-4 shadow-lg border-slate-200">
                        <CardHeader className="bg-slate-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Panier Actuel</span>
                                <Badge variant="secondary">{cartItems.length} articles</Badge>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-0">
                            {/* Mini Cart List */}
                            <div className="max-h-[300px] overflow-y-auto p-4 space-y-3 bg-white">
                                {cartItems.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Votre panier est vide</p>
                                    </div>
                                ) : (
                                    cartItems.map(item => (
                                        <div key={item.product.id} className="flex gap-2 p-2 bg-slate-50 rounded-lg border">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {item.product.nomProduit}
                                                </p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <p className="text-xs text-slate-500">
                                                        {item.product.prixVente} × {item.quantity}
                                                    </p>
                                                    <p className="text-xs font-bold">
                                                        {(item.product.prixVente * item.quantity).toFixed(2)} DH
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end pl-2">
                                                <div className="flex items-center gap-1">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.product.id, -1)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.product.id, 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleRemoveItem(item.product.id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Separator />

                            <div className="p-4 bg-slate-50">
                                <PaymentSection
                                    total={total}
                                    onProcessSale={handleProcessSale}
                                    isProcessing={isProcessing}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Helper component to reduce duplication logic
function ProductList({ products, isLoading, cartItems, onAdd }: { products: Product[], isLoading: boolean, cartItems: CartItem[], onAdd: (p: Product) => void }) {
    if (isLoading) {
        return (
            <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-slate-400" />
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
            {products.map(product => {
                const Icon = getCategoryIcon(product.categorie || '');
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

                        <Button
                            onClick={() => onAdd(product)}
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
    );
}
