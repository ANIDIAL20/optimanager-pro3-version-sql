'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';
import { useToast } from '@/hooks/use-toast';
import { getClientAvailableLenses } from '@/app/actions/pos-lens-actions';
import { getClientReservationsAction, createFrameReservationAction, completeFrameReservationAction } from '@/app/actions/reservation-actions';
import { createSale } from '@/app/actions/sales-actions';
import { createLineItem, recalculateLineTotal } from '@/lib/pos/pricing';
import { Product, Client } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, Printer } from 'lucide-react';
import { ProductSearch } from './product-search';
import { Cart } from './cart';
import { PaymentSection } from './payment-section';
import { SalesHistory } from './sales-history';

interface ClientPOSProps {
    client: Client; 
    clientId: string;
}

export function ClientPOS({ client, clientId }: ClientPOSProps) {
    const router = useRouter();
    const { items: cartItems, setItems, updateLinePricing, totalAmount } = usePosCartStore();
    const [isProcessing, setIsProcessing] = React.useState(false);
    const { toast } = useToast();
    // Simple state to force refresh history
    const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0);
    const [pendingOrders, setPendingOrders] = React.useState<any[]>([]);
    const [debugInfo, setDebugInfo] = React.useState<any>(null);

    React.useEffect(() => {
        if (clientId) {
            console.log('🎨 [ClientPOS] Component mounted for client:', clientId);
            getClientAvailableLenses(clientId).then(res => {
                console.log('📦 [ClientPOS] Lens Data received:', res.data?.length || 0);
                if (res.success && res.data) {
                    setPendingOrders(res.data);
                    setDebugInfo({
                        clientId,
                        count: res.data.length,
                        timestamp: new Date().toLocaleTimeString()
                    });
                    
                    if (res.data.length > 0) {
                        toast({
                            title: `✨ ${res.data.length} commande(s) de verres disponible(s)`,
                            description: 'Consultez l\'onglet Verres pour les ajouter.',
                        });
                    }
                } else if (res.error) {
                    console.error('❌ [ClientPOS] Error fetching lens orders:', res.error);
                }
            });

            // Check if there is a reservation to load in URL
            const urlParams = new URLSearchParams(window.location.search);
            const resId = urlParams.get('reservationId');
            if (resId) {
                // Clear reservation from URL to avoid re-adding on refresh
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('reservationId');
                window.history.replaceState({}, '', newUrl);

                // Fetch and add items
                getClientReservationsAction(clientId).then(res => {
                    if (res.success && res.data) {
                        const reservation = (res.data as any[]).find(r => r.id.toString() === resId);
                        if (reservation && reservation.status === 'PENDING') {
                            const newLines = reservation.items
                                .map((item: any) => {
                                    const unitPrice =
                                        typeof item.unitPrice === 'number'
                                            ? item.unitPrice
                                            : parseFloat(item.unitPrice ?? '0');

                                    return createLineItem(
                                        item.productId.toString(),
                                        item.productName,
                                        Number.isFinite(unitPrice) ? unitPrice : 0,
                                        item.quantity,
                                        'MONTURE'
                                    );
                                })
                                .map((line: any) => ({ ...line, fromReservation: reservation.id }));

                            setItems([...cartItems, ...newLines]);
                            toast({ title: "Déjà réservé", description: "Les montures réservées ont été ajoutées au panier." });
                        }
                    }
                });
            }
        }
    }, [clientId]);

    const addLensOrderToCart = ({ product, lensOrder }: { product: any, lensOrder: any }) => {
        const virtualId = `LO-${lensOrder.id}`;
        if (cartItems.some(item => item.productId === virtualId)) {
            toast({ description: "Cette commande est déjà dans le panier." });
            return;
        }

        const price = parseFloat(lensOrder.sellingPrice);
        const newLine = createLineItem(
            virtualId,
            `Verres: ${lensOrder.lensType}`,
            price,
            1,
            'VERRE',
            { 
                lensOrderId: lensOrder.id,
                prescription: {
                    sphereR: lensOrder.sphereR,
                    cylindreR: lensOrder.cylindreR,
                    sphereL: lensOrder.sphereL,
                    cylindreL: lensOrder.cylindreL
                }
            }
        );

        setItems([...cartItems, newLine]);
        toast({ title: "Ajouté", description: "Commande ajoutée au panier." });
    };

    const addToCart = (product: Product) => {
        const existingIndex = cartItems.findIndex(item => item.productId === product.id);

        if (existingIndex >= 0) {
            // Check stock limit for existing item
            const existingItem = cartItems[existingIndex];
            const maxAllowed = product.type === 'MONTURE' ? (product.availableQuantity ?? product.quantiteStock) : product.quantiteStock;
            
            if (existingItem.quantity >= maxAllowed) {
                 toast({
                    title: "Stock insuffisant",
                    description: product.type === 'MONTURE' ? "Ce produit est réservé ou en rupture de stock." : "Vous avez atteint la limite du stock pour ce produit.",
                    variant: "destructive"
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
            // Check if available for first add
            const maxAllowed = product.type === 'MONTURE' ? (product.availableQuantity ?? product.quantiteStock) : product.quantiteStock;
            if (maxAllowed < 1) {
                toast({
                    title: "Stock insuffisant",
                    description: "Ce produit est réservé ou en rupture de stock.",
                    variant: "destructive"
                });
                return;
            }

            const newLine = createLineItem(
                product.id,
                product.nomProduit,
                product.prixVente,
                1,
                product.type,
                undefined, // metadata
                product.reference // productReference
            );
            setItems([...cartItems, newLine]);
        }
    };

    const updateQuantity = (productId: string, delta: number) => {
        const newItems = cartItems.map(item => {
            if (item.productId === productId) {
                // Find original product to check stock (if available in some context, or skip strict check here if product object not handy)
                // In this architecture, we might need to fetch product or store maxStock in item metadata.
                // For now, let's just update and assume UI handles max disabling.
                // ideally PosLineItem could carry maxStock.
                
                const newQuantity = item.quantity + delta;
                if (newQuantity < 1) return item; 
                
                return recalculateLineTotal({ ...item, quantity: newQuantity });
            }
            return item;
        });
        setItems(newItems);
    };

    const removeFromCart = (productId: string) => {
        setItems(cartItems.filter(item => item.productId !== productId));
    };

    const clearCart = () => setItems([]);

    const handleReserveFrame = async () => {
        const frames = cartItems.filter(item => item.type === 'MONTURE' && !item.fromReservation);
        
        if (frames.length === 0) {
            toast({
                title: 'Aucune monture',
                description: 'Le panier ne contient aucune monture non-réservée à enregistrer.',
                variant: 'destructive',
            });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await createFrameReservationAction({
                storeId: 'ADMIN_STORE', // This should normally come from auth context
                clientId: parseInt(clientId),
                clientName: `${client.prenom} ${client.nom}`,
                items: frames.map(f => ({
                    productId: parseInt(f.productId),
                    quantity: f.quantity,
                })),
                expiryDays: 7,
                notes: 'Réservation créée depuis le POS'
            });

            if (result.success) {
                // Remove frames from current cart
                const remainingItems = cartItems.filter(item => !frames.some(f => f.lineId === item.lineId));
                setItems(remainingItems);
                
                toast({
                    title: 'Réservation créée',
                    description: `Monture(s) réservée(s) avec succès.`,
                });
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
            setIsProcessing(false);
        }
    };

    const handleProcessSale = async (paymentData: { amountPaid: number; method: string; notes: string }) => {
        if (cartItems.length === 0) return;

        setIsProcessing(true);

        try {
            // Map cart items to SaleItem
            const saleItems = cartItems.map(item => ({
                productRef: item.productId.startsWith('LO-') ? item.productId : item.productId, // We might need real ref from product if available
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice, // Discounted price
                total: item.lineTotal
            }));
            
            const lensOrderIds = cartItems
                .filter(item => item.productId.startsWith('LO-'))
                .map(item => parseInt(item.productId.replace('LO-', '')));

            const result = await createSale({
                clientId,
                items: saleItems,
                lensOrderIds,
                paymentMethod: paymentData.method,
                notes: paymentData.notes ? `${paymentData.notes} (Initial payment: ${paymentData.amountPaid})` : undefined,
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            const saleId = parseInt(result.id || "0"); // result.id contains the created sale ID
            
            // Complete reservations if any
            const reservationIds = [...new Set(
                cartItems
                    .filter(item => item.fromReservation)
                    .map(item => item.fromReservation!)
            )];

            if (saleId && reservationIds.length > 0) {
                for (const resId of reservationIds) {
                    await completeFrameReservationAction({
                        reservationId: resId,
                        saleId: saleId,
                    });
                }
            }

            toast({
                title: "Vente réussie !",
                description: "La vente a été enregistrée avec succès. Redirection...",
            });

            clearCart();
            setHistoryRefreshKey(prev => prev + 1);
            
            // Redirect to Sale Details
            router.push(`/dashboard/ventes/${saleId}`);

        } catch (error: any) {
            console.error("Sale Error:", error);
            toast({
                title: "Erreur",
                description: "Impossible d'enregistrer la vente. " + (error?.message || ''),
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const total = totalAmount;

    return (
        <div className="space-y-6">
            {/* Visual Debug Panel (Available in dev mode logic) */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded text-[10px] font-mono text-amber-800 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                    <span>DEBUG: Client {debugInfo.clientId} | {debugInfo.count} orders </span>
                    <span>Last refresh: {debugInfo.timestamp}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-[600px]">
                {/* Left Col: Product Search (40%) */}
                <div className="md:col-span-2 flex flex-col gap-4 border-r pr-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="outline">1</Badge> Sélectionner Produits
                    </h3>
                    <ProductSearch 
                        onProductSelect={addToCart} 
                        clientLenses={pendingOrders}
                        onLensSelect={(product, lensOrder) => addLensOrderToCart({ product, lensOrder })}
                        addedLensIds={cartItems.filter(i => i.productId.startsWith('LO-')).map(i => i.productId.replace('LO-', ''))}
                    />
                </div>

                {/* Right Col: Cart & Payment (60%) */}
                <div className="md:col-span-3 flex flex-col gap-4 pl-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="outline">2</Badge> Panier & Paiement
                    </h3>

                    <div className="flex-1 border rounded-md p-4 bg-card shadow-sm flex flex-col gap-4">
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            <Cart
                                items={cartItems}
                                onUpdateQuantity={updateQuantity}
                                onRemoveItem={removeFromCart}
                                onClearCart={clearCart}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                             <Button 
                                 variant="outline" 
                                 className="border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 gap-2 h-11"
                                 onClick={handleReserveFrame}
                                 disabled={isProcessing || !cartItems.some(i => i.type === 'MONTURE' && !i.fromReservation)}
                             >
                                 <Tag className="h-4 w-4" />
                                 Réserver
                             </Button>
                             <Button className="h-11 bg-slate-900 gap-2" disabled>
                                 <Printer className="h-4 w-4" />
                                 Devis
                             </Button>
                        </div>

                        <Separator />

                        <PaymentSection
                            total={total}
                            onProcessSale={handleProcessSale}
                            isProcessing={isProcessing}
                        />
                    </div>
                </div>
            </div>

            <Separator className="my-6" />

            <Card>
                <CardHeader>
                    <CardTitle>Historique des Ventes</CardTitle>
                    <CardDescription>Les dernières ventes effectuées pour {client.prenom} {client.nom}</CardDescription>
                </CardHeader>
                <CardContent>
                    <SalesHistory clientId={clientId} key={historyRefreshKey} />
                </CardContent>
            </Card>
        </div>
    );
}
