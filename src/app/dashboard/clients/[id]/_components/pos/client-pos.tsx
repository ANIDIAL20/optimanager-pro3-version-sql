'use client';

import * as React from 'react';
import { useFirestore, useFirebase } from '@/firebase';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
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
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ClientPOSProps {
    client: Client;
    clientId: string;
}

export function ClientPOS({ client, clientId }: ClientPOSProps) {
    const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const firestore = useFirestore();
    const { user } = useFirebase();
    const { toast } = useToast();

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
        if (!firestore) return;
        if (cartItems.length === 0) return;

        setIsProcessing(true);

        try {
            const batch = writeBatch(firestore);

            // 1. Create Sale Document
            if (!user) return; // Hook already called, just safety check

            // 1. Create Sale Document
            const salesRef = collection(firestore, `stores/${user.uid}/sales`);
            const newSaleRef = doc(salesRef);

            const totalNet = cartItems.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);
            const resteAPayer = Math.max(0, totalNet - paymentData.amountPaid);
            const saleDate = new Date().toISOString();

            batch.set(newSaleRef, {
                clientId,
                date: saleDate,
                totalNet,
                totalPaye: paymentData.amountPaid,
                resteAPayer,
                notes: paymentData.notes,
                status: resteAPayer > 0 ? 'impaye' : 'paye'
            });

            // 2. Add Sale Items
            cartItems.forEach(item => {
                const detailRef = doc(collection(firestore, `stores/${user.uid}/sales/${newSaleRef.id}/orderDetails`));
                batch.set(detailRef, {
                    orderId: newSaleRef.id,
                    produitId: item.product.id,
                    nom: item.product.nomProduit,
                    prix: item.product.prixVente,
                    quantite: item.quantity
                });

                // 3. Update Product Stock
                const productRef = doc(firestore, `stores/${user.uid}/products`, item.product.id);
                batch.update(productRef, {
                    quantiteStock: item.product.quantiteStock - item.quantity
                });

                // 4. Log Movement
                const mvmtRef = doc(collection(firestore, `stores/${user.uid}/stockMovements`));
                batch.set(mvmtRef, {
                    produitId: item.product.id,
                    quantite: -item.quantity,
                    type: 'Vente',
                    ref: newSaleRef.id,
                    date: saleDate
                });
            });

            // 5. Add Payment Record if paid
            if (paymentData.amountPaid > 0) {
                const paymentRef = doc(collection(firestore, `stores/${user.uid}/sales/${newSaleRef.id}/payments`));
                batch.set(paymentRef, {
                    saleId: newSaleRef.id,
                    montant: paymentData.amountPaid,
                    methode: paymentData.method,
                    date: saleDate
                });
            }

            // 6. Update Client Credit Balance if partial payment
            // We need to read current balance first or use increment. 
            // We'll leave this simple for now: this POS handles sales. 
            // Managing global client debt can be done via proper debt management module or recalculating from sales.

            await batch.commit();

            toast({
                title: "Vente réussie !",
                description: "La vente a été enregistrée avec succès.",
                // icon: <CheckCircle2 className="text-green-600" />
            });

            clearCart();
            // Optional: Trigger refresh of history -> invalidation handled by realtime listeners usually.

        } catch (error: any) {
            console.error("Sale Error:", error);
            toast({
                title: "Erreur",
                description: "Impossible d'enregistrer la vente. " + error?.message,
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const total = cartItems.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);

    return (
        <div className="space-y-6">
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
                    <SalesHistory clientId={clientId} />
                </CardContent>
            </Card>
        </div>
    );
}
