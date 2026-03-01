'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { 
    getPendingLensOrders as getClientAvailableLenses, 
    getAdvanceForProduct 
} from '@/app/actions/lens-orders-actions';
import { getClientReservationsAction as getClientReservations } from '@/app/actions/reservation-actions';
import { getClientTransactions } from '@/app/actions/client-transactions-actions';
import { createLineItem, recalculateLineTotal } from '@/features/pos/utils/pricing';
import type { PosLineItemWithAdvance } from '@/types/pos';
import { Product, Client } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogueProduits } from '@/features/pos/components/CatalogueProduits';
import { SalesHistory } from './sales-history';
import { PosCartPanel } from '@/features/pos/components/PosCartPanel';

interface ClientPOSProps {
    client: Client;
    clientId: string;
    initialReservationId?: number | null;
    initialOrderId?: number | null;
}

export function ClientPOS({ client, clientId, initialReservationId, initialOrderId }: ClientPOSProps) {
    const router = useRouter();
    const { items: cartItems, setItems, updateLinePricing, totalAmount, setSelectedClient } = usePosCartStore();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    const [transactions, setTransactions] = React.useState<any[]>([]);
    const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0);
    const [pendingOrders, setPendingOrders] = React.useState<any[]>([]);
    const [debugInfo, setDebugInfo] = React.useState<any>(null);

    // Sync client to store
    React.useEffect(() => {
        if (client) {
            setSelectedClient({
                ...client,
                id: clientId,
                name: `${client.prenom} ${client.nom}`,
                fullName: `${client.prenom} ${client.nom}`
            } as any);
        }
    }, [client, clientId, setSelectedClient]);

    React.useEffect(() => {
        if (clientId) {

            // 0. Fetch client transactions 
            getClientTransactions(clientId).then(res => {
                if (res.success && res.transactions) {
                    setTransactions(res.transactions);
                }
            }).catch(error => {
                console.error('❌ [ClientPOS] Error fetching client transactions:', error);
            });

            // 1. Fetch Lens Orders
            getClientAvailableLenses(clientId).then(res => {
                if (res.success && res.data) {
                    setPendingOrders(res.data);
                    setDebugInfo({
                        clientId,
                        count: res.data.length,
                        timestamp: new Date().toLocaleTimeString()
                    });
                }
            });
        }

        // Handle Reservation Loading
        const handleLoadReservation = (id: string) => {
            getClientReservations(parseInt(clientId)).then(reservations => {
                const reservation = reservations.find(r => r.id.toString() === id);
                if (reservation && reservation.status === 'PENDING') {
                    if (usePosCartStore.getState().items.some(item => item.fromReservation === reservation.id)) return;

                    const match = reservation.notes?.match(/\[Avance existante liée:\s*([\d.]+)\s*MAD\]/);
                    const parsedAvance = match ? parseFloat(match[1]) : 0;

                    const newLines = reservation.items.map((item: any) => {
                        const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice ?? '0');
                        return createLineItem(
                            item.productId.toString(),
                            item.productName,
                            Number.isFinite(unitPrice) ? unitPrice : 0,
                            item.quantity,
                            'MONTURE',
                            parsedAvance > 0 ? { avanceLinkee: parsedAvance } : undefined
                        );
                    }).map((line: any) => ({ ...line, fromReservation: reservation.id }));

                    setItems([...usePosCartStore.getState().items, ...newLines]);
                    toast({ title: "Déjà réservé", description: "Les montures réservées ont été ajoutées au panier." });
                }
            });
        };

        const urlParams = new URLSearchParams(window.location.search);
        const resIdFromUrl = urlParams.get('reservationId');
        
        if (initialReservationId) {
            handleLoadReservation(initialReservationId.toString());
        } else if (resIdFromUrl) {
            handleLoadReservation(resIdFromUrl);
        }

        // Handle Order Loading
        if (initialOrderId) {
            getClientAvailableLenses(clientId).then(res => {
                if (res.success && res.data) {
                    const order = res.data.find((o: any) => o.id === initialOrderId);
                    if (order) {
                        const virtualId = `LO-${order.id}`;
                        if (!usePosCartStore.getState().items.some(item => item.productId === virtualId)) {
                            const price = parseFloat(order.sellingPrice);
                            const newLine: PosLineItemWithAdvance = {
                                ...createLineItem(
                                    virtualId,
                                    `Verres: ${order.lensType}`,
                                    price,
                                    1,
                                    'VERRE',
                                    {
                                        lensOrderId: order.id,
                                        prescription: {
                                            sphereR: order.sphereR,
                                            cylindreR: order.cylindreR,
                                            sphereL: order.sphereL,
                                            cylindreL: order.cylindreL
                                        }
                                    }
                                ),
                                lensOrderId: order.id,
                                advanceAlreadyPaid: Number(order.amountPaid || 0),
                            };
                            setItems([...usePosCartStore.getState().items, newLine]);
                        }
                    }
                }
            });
        }
    }, [clientId, initialReservationId, initialOrderId]);

    const detectedAdvances = React.useMemo(() => {
        // ✅ Only track RESERVATION advances here via tx, lens orders are handled directly by the store
        const resIds = [...new Set(cartItems.filter(item => item.fromReservation).map(item => `RESERVATION:${item.fromReservation}`))];
        const txAdvance = transactions.filter(t => t.type === 'PAYMENT' && t.referenceId && resIds.includes(t.referenceId)).reduce((sum, t) => sum + Math.abs(t.amount), 0);

        let manualAdvances = 0;
        const processedReservations = new Set();
        cartItems.forEach(item => {
            if (item.fromReservation && item.metadata?.avanceLinkee && !processedReservations.has(item.fromReservation)) {
                manualAdvances += item.metadata.avanceLinkee;
                processedReservations.add(item.fromReservation);
            }
        });

        return txAdvance + manualAdvances;
    }, [cartItems, transactions]);

    const addLensOrderToCart = ({ product, lensOrder }: { product: any, lensOrder: any }) => {
        const virtualId = `LO-${lensOrder.id}`;
        if (cartItems.some(item => item.productId === virtualId)) return;
        const price = parseFloat(lensOrder.sellingPrice);
        const advancePaid = Number(lensOrder.amountPaid || 0);
        const newLine: PosLineItemWithAdvance = {
            ...createLineItem(virtualId, `Verres: ${lensOrder.lensType}`, price, 1, 'VERRE', {
                lensOrderId: lensOrder.id,
                prescription: { sphereR: lensOrder.sphereR, cylindreR: lensOrder.cylindreR, sphereL: lensOrder.sphereL, cylindreL: lensOrder.cylindreL }
            }),
            lensOrderId: lensOrder.id,
            advanceAlreadyPaid: advancePaid,
        };
        setItems([...cartItems, newLine]);
    };

    const addToCart = async (product: Product) => {
        const existingIndex = cartItems.findIndex(item => item.productId === product.id);
        
        if (existingIndex >= 0) {
            const existingItem = cartItems[existingIndex];
            const maxAllowed = product.type === 'MONTURE' ? (product.availableQuantity ?? product.quantiteStock) : product.quantiteStock;
            if (existingItem.quantity >= maxAllowed) return;
            const newItems = [...cartItems];
            newItems[existingIndex] = recalculateLineTotal({ ...existingItem, quantity: existingItem.quantity + 1 });
            setItems(newItems);
        } else {
            const maxAllowed = product.type === 'MONTURE' ? (product.availableQuantity ?? product.quantiteStock) : product.quantiteStock;
            if (maxAllowed < 1) return;

            let advanceAlreadyPaid = 0;
            let linkedLensOrderId: string | undefined;

            // ✅ Smart Detection for Lens Orders
            if (product.reference?.startsWith('VERRE-') && clientId) {
                try {
                    const res = await getAdvanceForProduct(clientId, product.reference);
                    if (res.success && res.data) {
                        advanceAlreadyPaid = res.data.advance;
                        linkedLensOrderId = res.data.lensOrderId.toString();
                        
                        toast({
                            title: "Avance détectée",
                            description: `Une avance de ${advanceAlreadyPaid} MAD a été liée à ce produit.`,
                            className: "bg-emerald-50 border-emerald-200 text-emerald-800"
                        });
                    }
                } catch (err) {
                    console.error('Error detecting advance:', err);
                }
            }

            const baseLine = createLineItem(product.id, product.nomProduit, product.prixVente, 1, product.type, undefined, product.reference);
            
            const newLine: PosLineItemWithAdvance = {
                ...baseLine,
                lensOrderId: linkedLensOrderId ? parseInt(linkedLensOrderId) : undefined,
                advanceAlreadyPaid: advanceAlreadyPaid,
            };

            setItems([...cartItems, newLine]);
        }
    };


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 flex flex-col gap-4 border-r pr-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-lg px-3 py-1 bg-white shadow-sm border-slate-200">
                            1
                        </Badge>
                        <h3 className="font-semibold text-lg text-slate-800">Catalogue Produits</h3>
                    </div>
                    <CatalogueProduits 
                        clientId={parseInt(clientId)} 
                        onCustomAdd={addToCart} 
                    />
                </div>

                <div className="lg:col-span-1 flex flex-col gap-4 pl-0">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-lg px-3 py-1 bg-white shadow-sm border-slate-200">
                            2
                        </Badge>
                        <h3 className="font-semibold text-lg text-slate-800">Encaissement</h3>
                    </div>
                    <PosCartPanel 
                        alreadyPaid={detectedAdvances}
                        className="w-full shadow-2xl shadow-indigo-100/50 hover:shadow-indigo-200/50 transition-shadow duration-500 rounded-3xl lg:sticky lg:top-4"
                        onSuccess={() => {
                            setHistoryRefreshKey(prev => prev + 1);
                            queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
                            queryClient.invalidateQueries({ queryKey: ['lens-orders'] });
                            queryClient.invalidateQueries({ queryKey: ['notifications'] });
                        }}
                    />
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
