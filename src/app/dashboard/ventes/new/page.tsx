'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Client, Product } from '@/lib/types';
// import { Cart } from '@/app/dashboard/clients/[id]/_components/pos/cart'; // Unused
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Receipt, Search, Package, Plus, ShoppingCart, Minus, Trash2, UserPlus, Sparkles, CheckCircle2, Tag } from 'lucide-react';
import Link from 'next/link';
import { ClientSelector } from '@/components/sales/client-selector';
import { QuickClientDialog } from '@/components/clients/quick-client-dialog';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';
import { PaymentSection } from '@/app/dashboard/clients/[id]/_components/pos/payment-section';

// Server Actions
// Server Actions - NEW Architecture
import { getClients } from '@/features/clients/actions';
import { getProducts, getCategories, type Product as ActionProduct } from '@/app/actions/products-actions'; // Still using this for POS products 
import { createSale } from '@/app/actions/sales-actions';
import { getPendingLensOrders } from '@/app/actions/lens-orders-actions';
import { BrandLoader } from '@/components/ui/loader-brand';
import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';
import { createLineItem, recalculateLineTotal } from '@/features/pos/utils/pricing';
import { DiscountDialog } from '@/components/clients/discount-dialog';
import { LensDetailsDialog } from '@/components/sales/lens-details-dialog';

export default function NewSalePage() {
    const router = useRouter();
    const { items: cartItems, setItems, updateLinePricing, updateLensDetails, totalAmount } = usePosCartStore();
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
    const [products, setProducts] = React.useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('all');
    const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
    const [pendingOrders, setPendingOrders] = React.useState<any[]>([]); // New State

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
                            const fullName = c.fullName || (c as any).name || '';
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
                             modele: p.modele,
                             couleur: p.couleur,
                             description: p.description,
                             productType: p.productType
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

    // Fetch pending orders when client changes
    React.useEffect(() => {
        if (selectedClient?.id) {
            getPendingLensOrders(selectedClient.id).then(res => {
                if (res.success && res.data) {
                     setPendingOrders(res.data);
                } else {
                     setPendingOrders([]);
                }
            });
        } else {
            setPendingOrders([]);
        }
    }, [selectedClient]);

    const handleAddLensOrder = (order: any) => {
        // Prevent dupes
        if (cartItems.some(item => item.lensOrderId === order.id)) {
            toast({ description: "Cette commande est déjà dans le panier." });
            return;
        }

        const isReceived = order.status === 'received';
        const isContact = order.orderType === 'contact';
        const price = parseFloat(order.sellingPrice || '0');

        const newLine = {
            ...createLineItem(
                `LO-${order.id}`,
                `${isReceived ? '✓' : '⚡'} ${isContact ? 'Lentilles' : 'Verres'}: ${order.lensType}`,
                price,
                1,
                'VERRE'
            ),
            lensOrderId: order.id
        };
        
        // Add to store
        setItems([...cartItems, newLine]);
        
        toast({ 
            title: isReceived ? "Commande ajoutée" : "Commande liée", 
            description: `${order.lensType} est prêt pour la facturation.` 
        });
    };

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
                p.reference?.toLowerCase().includes(query) ||
                p.marque?.toLowerCase().includes(query)
            );
        }
        return filtered;
    }, [products, activeCategory, searchQuery]);

    const handleAddToCart = (product: Product) => {
        const existingIndex = cartItems.findIndex(item => item.productId === product.id);

        if (existingIndex >= 0) {
            const existingItem = cartItems[existingIndex];
            if (existingItem.quantity >= product.quantiteStock) {
                toast({
                    variant: 'destructive',
                    title: 'Stock insuffisant',
                    description: `Seulement ${product.quantiteStock} en stock.`,
                });
                return;
            }
            const newItems = [...cartItems];
            newItems[existingIndex] = recalculateLineTotal({
                ...existingItem,
                quantity: existingItem.quantity + 1
            });
            setItems(newItems);
        } else {
            const newItem = createLineItem(
                product.id,
                product.nomProduit,
                product.prixVente,
                1,
                (product as any).productType === 'lens' ? 'VERRE' : 'AUTRE',
                { productType: (product as any).productType }
            );
            setItems([...cartItems, newItem]);
        }
    };

    const handleUpdateQuantity = (productId: string, delta: number) => {
        const newItems = cartItems.map(item => {
            if (item.productId === productId) {
                const newQuantity = item.quantity + delta;
                if (newQuantity < 1) return item;
                
                // Find original product to check stock
                const product = products.find(p => p.id === productId);
                if (product && newQuantity > product.quantiteStock && !productId.startsWith('LO-')) {
                    toast({
                        variant: 'destructive',
                        title: 'Stock insuffisant',
                        description: `Seulement ${product.quantiteStock} en stock.`,
                    });
                    return item;
                }
                return recalculateLineTotal({ ...item, quantity: newQuantity });
            }
            return item;
        });
        setItems(newItems);
    };

    const handleRemoveItem = (productId: string) => {
        setItems(cartItems.filter(item => item.productId !== productId));
    };

    const clearCart = () => setItems([]);

    const handleProcessSale = async (paymentData: { amountPaid: number; method: string; notes: string; isDeclared: boolean }) => {
        if (cartItems.length === 0) {
            toast({ title: "Panier vide", description: "Ajoutez au moins un produit.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);

        try {
            // Prepare items matching saleItemSchema
            const saleItems = cartItems.map(item => ({
                productId: item.productId,
                name: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                total: item.lineTotal
            }));

            // Client ID handling (ensure number)
            const clientIdNum = selectedClient?.id ? parseInt(selectedClient.id) : undefined;

            // Calculate Totals using store data
            const totalTTC = totalAmount;
            const totalHT = totalTTC / 1.2; 
            const totalTVA = totalTTC - totalHT;
            
            // Extract lensOrderIds
            const lensOrderIds = cartItems
                .filter(item => item.productId.startsWith('LO-'))
                .map(item => parseInt(item.productId.replace('LO-', '')));

            // Call New Feature Action
            const result = await createSale({
                clientId: clientIdNum?.toString(),
                items: cartItems.map(item => ({
                    productRef: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    tvaRate: 20, // Default, the action will override based on isDeclared
                    lensDetails: item.lensDetails
                })) as any,
                lensOrderIds, 
                paymentMethod: paymentData.method.toUpperCase(),
                notes: paymentData.notes,
                isDeclared: paymentData.isDeclared
            });

            if (result && (result as any).id) {
                 toast({ title: "✅ Vente réussie !", description: "La vente a été enregistrée avec succès." });
                 clearCart();
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

    const total = totalAmount;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                        <Link href="/dashboard/ventes">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <Receipt className="h-6 w-6" />
                                </div>
                                Nouvelle Vente
                            </h1>
                        </div>
                        <p className="text-slate-500 ml-1">Point de vente professionnel — Encaissement rapide</p>
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
                                <QuickClientDialog
                                    onClientCreated={setSelectedClient}
                                    trigger={
                                        <Button className="h-10 gap-2 px-4 shadow-sm" title="Créer un nouveau client">
                                            <UserPlus className="h-4 w-4" />
                                            <span className="hidden sm:inline">Nouveau Client</span>
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Step 1.5: Pending Orders (Smart Pro Logic) */}
            {pendingOrders.length > 0 && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                     <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-12 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white font-black">PRO</div>
                            <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">Commandes Détectées <span className="text-indigo-600">({pendingOrders.length})</span></h3>
                        </div>
                        <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 shadow-sm font-semibold px-2 py-0.5 flex gap-1.5 items-center rounded-full">
                            <Sparkles className="h-3 w-3 text-indigo-500" />
                            Auto-Sync
                        </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingOrders.map(order => {
                            const isAdded = cartItems.some(i => i.productId === `LO-${order.id}`);
                            const isReceived = order.status === 'received';
                            return (
                                <Card key={order.id} className={cn(
                                    "overflow-hidden border-2 transition-all duration-300 group hover:shadow-lg relative",
                                    isReceived 
                                        ? "border-emerald-100 bg-emerald-50/30 hover:border-emerald-400" 
                                        : "border-indigo-50 bg-indigo-50/20 hover:border-indigo-300",
                                    isAdded && "opacity-40 border-slate-100 pointer-events-none"
                                )}>
                                    <CardContent className="p-3 flex items-center justify-between gap-3">
                                        <div className="flex gap-3 items-center flex-1 min-w-0">
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center shadow-sm shrink-0",
                                                isReceived ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                                            )}>
                                                {isReceived ? <CheckCircle2 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                                            </div>
                                            <div className="space-y-0.5 overflow-hidden">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">
                                                        {order.lensType}
                                                    </p>
                                                    <Badge className={cn(
                                                        "text-[8px] h-3.5 px-1 rounded",
                                                        isReceived ? "bg-emerald-600 text-white" : "bg-slate-400 text-white"
                                                    )}>
                                                        {isReceived ? 'Prêt' : 'Fil'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                                    <span className="text-indigo-600">{order.orderType}</span>
                                                    <span>•</span>
                                                    <span className="text-slate-800">{parseFloat(order.sellingPrice).toLocaleString('fr-MA')} DH</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant={isAdded ? "ghost" : (isReceived ? "default" : "outline")}
                                            className={cn(
                                                "font-black text-[10px] h-8 px-3 rounded-lg border-2",
                                                !isAdded && isReceived && "bg-slate-900 border-slate-900 hover:bg-slate-800 text-white shadow-sm"
                                            )}
                                            onClick={() => handleAddLensOrder(order)}
                                            disabled={isAdded}
                                        >
                                            {isAdded ? "OK" : (isReceived ? "AJOUTER" : "LIER")}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

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
                            <div className="max-h-[350px] overflow-y-auto p-4 space-y-3 bg-white">
                                {cartItems.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Votre panier est vide</p>
                                    </div>
                                ) : (
                                    cartItems.map(item => (
                                        <div key={item.lineId} className="flex gap-2 p-2 bg-slate-50 rounded-lg border group">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {item.productName}
                                                </p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div className="flex flex-col">
                                                        <p className={cn("text-[11px]", item.priceMode !== 'STANDARD' ? "text-slate-400 line-through" : "text-slate-500")}>
                                                            {item.originalUnitPrice.toFixed(2)} × {item.quantity}
                                                        </p>
                                                        {item.priceMode !== 'STANDARD' && (
                                                            <p className="text-[11px] font-bold text-emerald-600">
                                                                {item.unitPrice.toFixed(2)} DH
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-bold">
                                                        {item.lineTotal.toFixed(2)} DH
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end pl-2">
                                                <div className="flex items-center gap-1">
                                                    <DiscountDialog 
                                                        lineId={item.lineId}
                                                        productName={item.productName}
                                                        originalPrice={item.originalUnitPrice}
                                                        currentPrice={item.unitPrice}
                                                        priceMode={item.priceMode}
                                                        discountPercent={item.discountPercent}
                                                        quantity={item.quantity}
                                                    />
                                                    {(item.type === 'VERRE' || (item.metadata && item.metadata.productType === 'lens')) && (
                                                        <LensDetailsDialog 
                                                            productName={item.productName}
                                                            initialDetails={item.lensDetails}
                                                            onSave={(details) => updateLensDetails(item.lineId, details)}
                                                        />
                                                    )}
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.productId, -1)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="text-xs font-semibold w-4 text-center tabular-nums">{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.productId, 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => handleRemoveItem(item.productId)}>
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
function ProductList({ products, isLoading, cartItems, onAdd }: { products: Product[], isLoading: boolean, cartItems: any[], onAdd: (p: Product) => void }) {
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
            {products.map(product => {
                const Icon = getCategoryIcon(product.categorie || '');
                const inCart = cartItems.find(item => item.productId === product.id);
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
