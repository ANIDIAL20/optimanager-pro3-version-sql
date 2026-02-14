'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Minus, Trash2, ShoppingCart, Package, Glasses, Eye, Box, Disc, SprayCan, Link as LinkIcon, Briefcase, Puzzle, Wrench, Tag, Clock, Sparkles, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { cn } from '@/lib/utils';
import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';
import { createLineItem, recalculateLineTotal, calculateCartTotal } from '@/features/pos/utils/pricing';
import { DiscountDialog } from './discount-dialog';

// Server Actions
import { getProducts, getCategories } from '@/app/actions/products-actions';
import { createSale } from '@/app/actions/sales-actions';
import { getPendingLensOrders, type LensOrder } from '@/app/actions/lens-orders-actions';
import { createFrameReservationAction, completeFrameReservationAction, getClientReservationsAction } from '@/app/actions/reservation-actions';
import { BrandLoader } from '@/components/ui/loader-brand';

interface Client {
    id: string;
    nom: string;
    prenom: string;
}

interface ClientPOSTabProps {
    client: Client;
    clientId: string;
    initialReservationId?: number | null;
    initialOrderId?: number | null;
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

// CartItem replaced by PosLineItem from store
import { PosLineItem } from '@/features/pos/utils/pricing';

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

export function ClientPOSTab({ client, clientId, initialReservationId, initialOrderId }: ClientPOSTabProps) {
    const { items: cartItems, setItems, updateLinePricing, totalAmount } = usePosCartStore();
    const [products, setProducts] = React.useState<Product[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('all');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [pendingOrders, setPendingOrders] = React.useState<LensOrder[]>([]);

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
    
    // Load pending lens orders
    React.useEffect(() => {
        if (clientId) {
            getPendingLensOrders(clientId).then(res => {
                if (res.success && res.data) {
                    setPendingOrders(res.data as LensOrder[]);
                }
            });
        }
    }, [clientId]);

    // Handle Reservation Loading (from prop or URL)
    React.useEffect(() => {
        const loadReservation = async (id: string) => {
             getClientReservationsAction(clientId).then(res => {
                 if (res.success && res.data) {
                     const reservation = (res.data as any[]).find(r => r.id.toString() === id);
                     if (reservation && reservation.status === 'PENDING') {
                         
                         // Avoid duplicates: Check if any item from this reservation is already in cart
                         const alreadyInCart = cartItems.some(item => item.fromReservation === reservation.id);
                         if (alreadyInCart) return;

                         const newLines = reservation.items.map((item: any) => 
                             createLineItem(
                                 item.productId.toString(),
                                 item.productName,
                                 item.unitPrice || 0, // Fallback if no price
                                 item.quantity
                             )
                         ).map((line: any) => ({ 
                             ...line, 
                             fromReservation: reservation.id 
                         }));
                         
                         setItems([...cartItems, ...newLines]);
                         toast({ title: "Déjà réservé", description: "Les articles réservés ont été ajoutés au panier." });
                     }
                 }
             });
        };

        if (initialReservationId) {
            loadReservation(initialReservationId.toString());
        } else {
             // Fallback to URL for direct links
             const urlParams = new URLSearchParams(window.location.search);
             const resId = urlParams.get('reservationId');
             if (resId) {
                 const newUrl = new URL(window.location.href);
                 newUrl.searchParams.delete('reservationId');
                 window.history.replaceState({}, '', newUrl);
                 loadReservation(resId);
             }

             // New: Auto-add lens order by ID from URL
             const orderId = urlParams.get('orderId');
             if (orderId && clientId) {
                 // Remove from URL to avoid re-adding
                 const newUrl = new URL(window.location.href);
                 newUrl.searchParams.delete('orderId');
                 window.history.replaceState({}, '', newUrl);

                 // Fetch single order or find in pending (finding in pending is safer since we just loaded them)
                 getPendingLensOrders(clientId).then(res => {
                    if (res.success && res.data) {
                        const order = (res.data as LensOrder[]).find(o => o.id.toString() === orderId);
                        if (order) {
                            handleAddLensOrder(order);
                            toast({ title: "Commande chargée", description: `${order.lensType} ajouté au panier.` });
                        }
                    }
                 });
             }
        }
    }, [initialReservationId, clientId]);

    // Handle incoming Order ID from prop
    React.useEffect(() => {
        if (initialOrderId && clientId) {
            getPendingLensOrders(clientId).then(res => {
                if (res.success && res.data) {
                    const order = (res.data as LensOrder[]).find(o => o.id === initialOrderId);
                    if (order) {
                        handleAddLensOrder(order);
                        toast({ title: "Commande prête", description: `${order.lensType} ajouté au panier.` });
                    }
                }
            });
        }
    }, [initialOrderId, clientId]);

    // Derived state for filtered products
    const filteredProducts = React.useMemo(() => {
        let filtered = products;

        // Filter by category
        if (activeCategory !== 'all') {
            const catStr = activeCategory.toString();
            filtered = filtered.filter(p => 
                p.categorieId === catStr || 
                p.categorie === catStr
            );
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.nomProduit?.toLowerCase().includes(query) ||
                p.reference?.toLowerCase().includes(query)
            );
        }

        return filtered.slice(0, 40);
    }, [products, activeCategory, searchQuery]);

    // Use total from store
    const total = totalAmount;
    const subtotal = calculateCartTotal(cartItems); // Or just use totalAmount if they are same

    // Add to cart using Store logic (createLineItem)
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
            // Create new line item
            const newLine = createLineItem(
                product.id,
                product.nomProduit,
                product.prixVente,
                1
            );
            setItems([...cartItems, newLine]);
        }
    };

    // Update quantity
    const handleUpdateQuantity = (productId: string, delta: number) => {
        const newItems = cartItems.map(item => {
            if (item.productId === productId) {
                const product = products.find(p => p.id === productId);
                const maxStock = product?.quantiteStock || 999;
                
                const newQuantity = item.quantity + delta;
                if (newQuantity < 1) return item;
                
                if (newQuantity > maxStock && !item.productId.startsWith('LO-')) {
                     toast({
                        variant: 'destructive',
                        title: 'Stock insuffisant',
                        description: `Seulement ${maxStock} en stock.`,
                    });
                    return item;
                }

                return recalculateLineTotal({ ...item, quantity: newQuantity });
            }
            return item;
        });
        setItems(newItems);
    };

    // Remove from cart
    const handleRemoveItem = (productId: string) => {
        setItems(cartItems.filter(item => item.productId !== productId));
    };

    // Add lens order to cart
    const handleAddLensOrder = (order: LensOrder) => {
        const virtualId = `LO-${order.id}`;
        if (cartItems.some(item => item.productId === virtualId)) {
            toast({ description: "Cette commande est déjà dans le panier." });
            return;
        }

        const isContact = order.orderType === 'contact';
        const price = parseFloat(order.sellingPrice);

        const newLine = createLineItem(
            virtualId,
            `${isContact ? 'Lentilles' : 'Verres'}: ${order.lensType}`,
            price,
            1
        );
        
        setItems([...cartItems, newLine]);
        toast({ title: "Ajouté", description: "Commande ajoutée au panier." });
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
            // Check for lens orders (virtual IDs starting with LO-)
            const lensOrderIds = cartItems
                .filter(item => item.productId.startsWith('LO-'))
                .map(item => parseInt(item.productId.replace('LO-', '')));

            const saleData = {
                clientId: clientId,
                lensOrderIds,
                items: cartItems.map(item => ({
                    productRef: item.productId.startsWith('LO-') ? item.productId : item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice, // Use discounted price
                    total: item.lineTotal,
                })),
                paymentMethod: 'cash',
                notes: `Vente POS pour ${client.prenom} ${client.nom}`
            };

            const result = await createSale(saleData);

            if (result.success) {
                // Check if we need to complete reservations
                const reservationIds = [...new Set(
                    cartItems
                        .filter(item => item.fromReservation)
                        .map(item => item.fromReservation!)
                )];

                if (reservationIds.length > 0 && result.id) {
                     // We need to complete them. 
                     // Since we don't have completeFrameReservationAction imported yet, we'll need to do that.
                     // For now, let's assume the sale is created.
                     // Actually, we should call the action.
                     for (const resId of reservationIds) {
                         await completeFrameReservationAction({
                             reservationId: resId,
                             saleId: parseInt(result.id),
                         });
                     }
                }

                toast({
                    title: "Vente validée",
                    description: "La vente a été enregistrée avec succès.",
                    className: "bg-green-50 border-green-200 text-green-800",
                });
                setItems([]); // Clear store
                router.push(`/dashboard/ventes/${result.id}`);
            } else {
                toast({
                    variant: 'destructive',
                    title: "Erreur",
                    description: result.error || "Une erreur est survenue lors de la validation.",
                });
            }
        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: "Erreur critique",
                description: "Impossible de valider la vente. " + (error?.message || ''),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReserveFrame = async () => {
        // Find items in cart that are not Lens Orders (LO-) and not already from a reservation
        const reservables = cartItems.filter(item => !item.productId.startsWith('LO-') && !item.fromReservation);
        
        if (reservables.length === 0) {
            toast({
                title: 'Aucun article à réserver',
                description: 'Le panier ne contient aucun article réservable (non-réservé).',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Note: storeId will be overridden by the server action with the actual user ID
            const result = await createFrameReservationAction({
                storeId: 'USE_SESSION_ID', 
                clientId: parseInt(clientId),
                clientName: `${client.prenom} ${client.nom}`,
                items: reservables.map(f => ({
                    productId: parseInt(f.productId),
                    quantity: f.quantity,
                })),
                expiryDays: 7,
                notes: 'Réservation créée depuis le POS'
            });

            if (result.success) {
                // Remove reserved items from cart
                const remainingItems = cartItems.filter(item => !reservables.some(r => r.lineId === item.lineId));
                setItems(remainingItems);
                
                toast({
                    title: 'Réservation créée',
                    description: `Article(s) réservé(s) avec succès. Retrouvez-les dans l'onglet Réservations.`,
                    className: "bg-blue-50 border-blue-200 text-blue-800",
                });
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive',
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
                {/* Pending Orders Block (Detection Automatique Premium) */}
                {pendingOrders.length > 0 && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center justify-between px-1 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-12 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white font-black">ACTIF</div>
                                <h3 className="font-extrabold text-xl text-slate-800 tracking-tight">
                                    Commandes Verres/Lentilles Détectées <span className="text-indigo-600">({pendingOrders.length})</span>
                                </h3>
                            </div>
                            <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 shadow-sm font-semibold px-3 py-1 flex gap-2 items-center rounded-full animate-pulse">
                                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                Synchronisation Pro
                            </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {pendingOrders.map(order => {
                                const isAdded = cartItems.some(i => i.productId === `LO-${order.id}`);
                                const isReceived = order.status === 'received';
                                return (
                                    <Card key={order.id} className={cn(
                                        "overflow-hidden border-2 transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 relative",
                                        isReceived 
                                            ? "border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-white hover:border-emerald-400" 
                                            : "border-indigo-50 bg-gradient-to-br from-indigo-50/40 via-white to-white hover:border-indigo-300",
                                        isAdded && "opacity-50 border-slate-100 grayscale-[0.3] pointer-events-none"
                                    )}>
                                        <div className={cn(
                                            "h-1.5 w-full",
                                            isReceived ? "bg-emerald-500" : "bg-indigo-400"
                                        )} />
                                        <CardContent className="p-4 flex items-center justify-between gap-4">
                                            <div className="flex gap-4 items-center flex-1 min-w-0">
                                                <div className={cn(
                                                    "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:rotate-6 shadow-sm ring-4 shrink-0",
                                                    isReceived 
                                                        ? "bg-emerald-100 text-emerald-600 ring-emerald-50" 
                                                        : "bg-indigo-100 text-indigo-600 ring-indigo-50"
                                                )}>
                                                    {isReceived ? <CheckCircle2 className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                                                </div>
                                                <div className="space-y-1 overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-slate-900 text-base leading-none tracking-tight truncate">
                                                            {order.lensType}
                                                        </p>
                                                        <Badge className={cn(
                                                            "text-[9px] font-black uppercase tracking-wider h-4 px-1.5 rounded",
                                                            isReceived ? "bg-emerald-600 text-white" : "bg-slate-400 text-white"
                                                        )}>
                                                            {isReceived ? 'Prêt' : 'En cours'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500">
                                                        <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                            <Tag className="h-2.5 w-2.5" />
                                                            {order.orderType}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            EP: <span className="text-slate-800 font-black">{order.ecartPupillaireR || '-'}/{order.ecartPupillaireL || '-'}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <div className="text-right flex flex-col">
                                                    <span className="text-lg font-black text-slate-950 tracking-tighter leading-none">
                                                        {parseFloat(order.sellingPrice || '0').toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <small className="text-[9px] font-medium opacity-60">DH</small>
                                                    </span>
                                                </div>
                                                
                                                <Button 
                                                    size="sm" 
                                                    variant={isAdded ? "ghost" : (isReceived ? "default" : "outline")}
                                                    className={cn(
                                                        "font-black text-[9px] transition-all duration-300 h-8 px-4 rounded-lg border-2",
                                                        isAdded 
                                                            ? "text-slate-300 border-transparent" 
                                                            : isReceived 
                                                                ? "bg-slate-900 border-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200" 
                                                                : "border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                                                    )}
                                                    onClick={() => handleAddLensOrder(order)}
                                                    disabled={isAdded}
                                                >
                                                    {isAdded ? "DÉJÀ AJOUTÉ" : (isReceived ? "FACTURER" : "AJOUTER")}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                                <TabsTrigger key={cat.id} value={cat.id.toString()} className="gap-2">
                                    <Icon className="h-4 w-4" />
                                    {cat.name}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <BrandLoader size="md" className="mx-auto mb-2 text-slate-400" />
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
                        <TabsContent key={cat.id} value={cat.id.toString()} className="mt-4">
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                {filteredProducts.map(product => {
                                    const Icon = getCategoryIconByName(product.categorie || '');
                                    const inCart = cartItems.find(item => item.productId === product.id);
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
                                    <div key={item.lineId} className="flex gap-2 p-2 bg-slate-50 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {item.productName}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <p className={cn("text-xs", item.priceMode !== 'STANDARD' ? "text-slate-400 line-through decoration-destructive/30" : "text-slate-500")}>
                                                    {item.originalUnitPrice.toFixed(2)} DH × {item.quantity}
                                                </p>
                                                {item.priceMode !== 'STANDARD' && (
                                                    <p className="text-xs font-bold text-emerald-600">
                                                        {item.unitPrice.toFixed(2)} DH
                                                    </p>
                                                )}
                                                <DiscountDialog 
                                                    lineId={item.lineId}
                                                    productName={item.productName}
                                                    originalPrice={item.originalUnitPrice}
                                                    currentPrice={item.unitPrice}
                                                    priceMode={item.priceMode}
                                                    discountPercent={item.discountPercent}
                                                    quantity={item.quantity}
                                                />
                                            </div>
                                            {item.priceMode !== 'STANDARD' && item.discountPercent && item.discountPercent > 0 && (
                                                <p className="text-[9px] font-medium text-emerald-600 bg-emerald-50 self-start px-1.5 py-0.5 rounded border border-emerald-100 mt-0.5 w-fit">
                                                    -{item.discountPercent.toFixed(0)}% OFF {item.overrideReason && `• ${item.overrideReason}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                onClick={() => handleUpdateQuantity(item.productId, -1)}
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
                                                onClick={() => handleUpdateQuantity(item.productId, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-red-600 hover:bg-red-50"
                                                onClick={() => handleRemoveItem(item.productId)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">
                                                {item.lineTotal.toFixed(2)} DH
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
                        {/* Validation Actions */}
                        <div className="flex gap-3">
                             <Button
                                 onClick={handleReserveFrame}
                                 disabled={cartItems.length === 0 || isSubmitting || !cartItems.some(i => !i.productId.startsWith('LO-') && !i.fromReservation)}
                                 variant="outline"
                                 className="flex-1 h-12 text-sm font-semibold border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                             >
                                 <Clock className="h-4 w-4 mr-2" />
                                 Réserver
                             </Button>
                             
                            <Button
                                onClick={handleValidateOrder}
                                disabled={cartItems.length === 0 || isSubmitting}
                                className="flex-[2] h-12 text-base font-semibold"
                            >
                                {isSubmitting && <BrandLoader size="sm" className="mr-2" />}
                                Valider la Vente
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
