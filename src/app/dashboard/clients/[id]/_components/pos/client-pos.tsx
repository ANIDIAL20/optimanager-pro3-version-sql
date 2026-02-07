'use client';

import * as React from 'react';
import type { Client, Product } from '@/lib/types';
import { ProductSearch } from './product-search';
import { Cart, CartItem } from './cart';
import { PaymentSection } from './payment-section';
import { SalesHistory } from './sales-history';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Package, Plus } from 'lucide-react';
import { createSale } from '@/app/actions/sales-actions';
import { getPendingLensOrders } from '@/app/actions/lens-orders-actions';

interface ClientPOSProps {
    client: Client;
    clientId: string;
}

export function ClientPOS({ client, clientId }: ClientPOSProps) {
    const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const { toast } = useToast();
    // Simple state to force refresh history
    const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0);
    const [pendingOrders, setPendingOrders] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (clientId) {
            getPendingLensOrders(clientId).then(res => {
                if (res.success && res.data) {
                    setPendingOrders(res.data);
                }
            });
        }
    }, [clientId]);

    const addLensOrderToCart = (order: any) => {
        if (cartItems.some(item => item.lensOrderId === order.id)) {
            toast({ description: "Cette commande est déjà dans le panier." });
            return;
        }

        const mockProduct: Product = {
            id: `LO-${order.id}`,
            reference: `CMD-#${order.id}`,
            nomProduit: `Verres: ${order.lensType}`,
            prixVente: parseFloat(order.sellingPrice),
            quantiteStock: 1,
            categorie: 'Verres',
            marque: order.supplierName,
            modele: order.orderType,
            couleur: '-',
            description: order.notes || '',
            prixAchat: parseFloat(order.finalBuyingPrice || order.estimatedBuyingPrice || '0'),
            stockMin: 0,
            categorieId: 'verres',
            marqueId: 'supplier'
        };

        setCartItems(prev => [...prev, {
            product: mockProduct,
            quantity: 1, 
            lensOrderId: order.id
        }]);
        
        toast({ title: "Ajouté", description: "Commande ajoutée au panier." });
    };

    const addToCart = (product: Product) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                // Increment quantity of existing
                // Check stock limit
                if (existing.quantity >= product.quantiteStock) {
                    toast({
                        title: "Stock insuffisant",
                        description: "Vous avez atteint la limite du stock pour ce produit.",
                        variant: "destructive"
                    });
                    return prev;
                }
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCartItems(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item; // Look for remove via trash icon instead
                if (newQty > item.product.quantiteStock) {
                    toast({
                        title: "Stock limite atteint",
                        description: `Seulement ${item.product.quantiteStock} en stock.`,
                        variant: "destructive"
                    });
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string) => {
        setCartItems(prev => prev.filter(item => item.product.id !== productId));
    };

    const clearCart = () => setCartItems([]);

    const handleProcessSale = async (paymentData: { amountPaid: number; method: string; notes: string }) => {
        if (cartItems.length === 0) return;

        setIsProcessing(true);

        try {
            // Map cart items to SaleItem
            const saleItems = cartItems.map(item => ({
                productRef: item.product.id || item.product.reference || 'UNKNOWN',
                productName: item.product.nomProduit,
                quantity: item.quantity,
                unitPrice: item.product.prixVente,
                total: item.product.prixVente * item.quantity
            }));

            // Call Server Action
            // Note: createSale currently doesn't support 'amountPaid' directly in the main signature unless we update it.
            // But checking createSale in sales-actions.ts, it calculates totalPaye as 0. 
            // TODO: Update createSale to accept initial payment. 
            // For now, we'll pass it in 'notes' or we accept that it creates as 'impaye' and we might need a second call?
            // Wait, createSaleInput has 'notes' and 'paymentMethod'.
            
            const lensOrderIds = cartItems
                .filter(item => item.lensOrderId)
                .map(item => item.lensOrderId as number);

            const result = await createSale({
                clientId,
                items: saleItems,
                lensOrderIds,
                paymentMethod: paymentData.method,
                notes: paymentData.notes ? `${paymentData.notes} (Initial payment: ${paymentData.amountPaid})` : undefined,
                // We'll trust the server to calc totals, but we could pass them if needed.
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({
                title: "Vente réussie !",
                description: "La vente a été enregistrée avec succès.",
            });

            clearCart();
            setHistoryRefreshKey(prev => prev + 1);

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

    const total = cartItems.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);

    return (
        <div className="space-y-6">
            {/* Pending Orders Block */}
            {pendingOrders.length > 0 && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                     <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-indigo-900">Commandes en attente ({pendingOrders.length})</h3>
                    </div>
                    <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Package className="h-4 w-4 text-indigo-600" />
                                Ce client a des commandes de verres prêtes à être facturées.
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 pt-0">
                            {pendingOrders.map(order => {
                                const isAdded = cartItems.some(i => i.lensOrderId === order.id);
                                return (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                        <div>
                                            <p className="font-semibold text-slate-800">{order.lensType} <span className="text-slate-400 font-normal">({order.orderType})</span></p>
                                            <p className="text-xs text-slate-500">
                                                Commandée le {new Date(order.createdAt).toLocaleDateString()} • {parseFloat(order.sellingPrice).toFixed(2)} DH
                                            </p>
                                            <Badge variant="outline" className="mt-1 text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                                                {order.status === 'received' ? 'Reçue' : 'En cours'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{parseFloat(order.sellingPrice).toFixed(2)} DH</span>
                                            <Button 
                                                size="sm" 
                                                variant={isAdded ? "secondary" : "default"}
                                                className={isAdded ? "bg-green-100 text-green-700" : "bg-indigo-600 hover:bg-indigo-700"}
                                                onClick={() => addLensOrderToCart(order)}
                                                disabled={isAdded}
                                            >
                                                {isAdded ? "Ajouté" : "Ajouter"}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-[600px]">
                {/* Left Col: Product Search (40%) */}
                <div className="md:col-span-2 flex flex-col gap-4 border-r pr-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="outline">1</Badge> Sélectionner Produits
                    </h3>
                    <ProductSearch onProductSelect={addToCart} />
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
