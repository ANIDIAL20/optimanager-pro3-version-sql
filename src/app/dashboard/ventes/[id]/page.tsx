'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Client, Sale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InvoiceActions } from '@/components/invoices/invoice-actions';
import { ArrowLeft, User, Phone, Building2, Receipt, RotateCcw, CreditCard } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { PageHeader } from '@/components/page-header';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ReturnItemsDialog } from '@/components/sales/return-items-dialog';
import { PaymentDialog } from '@/components/dashboard/commandes/payment-dialog';

// Server Actions
import { getSale } from '@/app/actions/sales-actions';
import { getClient } from '@/app/actions/clients-actions';
import { getShopProfile } from '@/app/actions/shop-actions';

export default function SaleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const { toast } = useToast();
    const [sale, setSale] = React.useState<Sale | null>(null);
    const [client, setClient] = React.useState<Client | null>(null);
    const [shopSettings, setShopSettings] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showReturnDialog, setShowReturnDialog] = React.useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    const handleRefresh = React.useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
        router.refresh();
    }, [router]);

    React.useEffect(() => {
        let isMounted = true;

        const fetchSaleDetails = async () => {
            try {
                // 1. Fetch Sale
                const saleRes = await getSale(id);
                if (!isMounted) return;

                if (!saleRes.success || !saleRes.sale) {
                    toast({
                        title: "Erreur",
                        description: saleRes.error || "Vente introuvable",
                        variant: "destructive"
                    });
                    router.push('/dashboard/ventes');
                    return;
                }

                // Map/Adapt Sale to match local Sale interface (lib/types)
                // Action returns SaleItem with { productRef, unitPrice }, legacy expects { productId, price }
                const fetchedSale = saleRes.sale;
                const saleData: Sale = {
                    ...fetchedSale,
                    clientId: fetchedSale.clientId || '', // Ensure string
                    date: fetchedSale.date || fetchedSale.createdAt,
                    // Map items
                    items: fetchedSale.items.map(item => ({
                        ...item,
                        productId: item.productRef, // Map Ref to ID
                        price: item.unitPrice,      // Map UnitPrice to Price
                        nomProduit: item.productName,
                        reference: item.productRef
                    }))
                } as unknown as Sale;
                
                setSale(saleData);

                // 2. Fetch Client if exists
                if (saleData.clientId) {
                    const clientRes = await getClient(saleData.clientId);
                    if (isMounted && clientRes.success && clientRes.client) {
                        // Adapt Client: Action returns New Client, FE uses Legacy?
                        // Similar adaptation as in Sales List
                        const c = clientRes.client;
                        const nameParts = c.name.split(' ');
                        const prenom = nameParts.length > 1 ? nameParts[0] : '';
                        const nom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : c.name;
                        
                        const adaptedClient: Client = {
                            ...c,
                             nom: c.nom || nom,
                             prenom: c.prenom || prenom,
                             telephone1: c.phone || c.telephone1 || '', // Map phone
                             id: c.id?.toString() || '',
                             // Mutuelle mapping
                             // clientRes.client property 'mutuelle' might be missing if not in schema yet?
                             // But we can rely on what we have.
                             // types.ts Client has mutuelle? Yes.
                             mutuelle: c.mutuelle || c.assuranceId // Fallback
                        } as any; // Cast to avoid strict errors during transition

                        setClient(adaptedClient);
                    }
                }

                // 3. Fetch Shop Settings (SQL)
                const settings = await getShopProfile();
                if (isMounted && settings) {
                    setShopSettings(settings);
                }

            } catch (error) {
                console.error("Error fetching details:", error);
                toast({
                    title: "Erreur",
                    description: "Impossible de charger les détails de la vente",
                    variant: "destructive"
                });
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchSaleDetails();
        
        return () => { isMounted = false; };
    }, [id, router, toast, refreshTrigger]);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!sale) return null;

    // Use totalNet as totalTTC for display
    const totalTTC = sale.totalNet || sale.totalTTC || 0;
    const totalHT = sale.totalHT || (totalTTC / 1.2);
    const totalTVA = sale.totalTVA || (totalTTC - totalHT);

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'paye': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'impaye': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'partiel': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'paye': return 'Payé';
            case 'impaye': return 'Non Payé';
            case 'partiel': return 'Partiel';
            default: return status || 'N/A';
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* Back Button */}
            <div className="w-fit">
                <BackButton />
            </div>

            {/* Header */}
            <PageHeader
                title={`Vente #${sale.saleNumber || sale.id.slice(0, 8)}`}
                description={`Effectuée le ${format(new Date(sale.date || sale.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`}
            >
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setShowReturnDialog(true)}>
                        <RotateCcw className="h-4 w-4" />
                        Retourner
                    </Button>
                    {client && shopSettings && (
                        <InvoiceActions sale={sale} client={client} shopSettings={shopSettings} />
                    )}
                    {sale && (
                        <>
                            <ReturnItemsDialog
                                sale={sale}
                                open={showReturnDialog}
                                onOpenChange={setShowReturnDialog}
                                onReturnSuccess={handleRefresh}
                            />
                            <PaymentDialog
                                order={sale}
                                open={showPaymentDialog}
                                onOpenChange={setShowPaymentDialog}
                                onPaymentSuccess={handleRefresh}
                            />
                        </>
                    )}
                </div>
            </PageHeader>

            {/* Top Cards: Status & Client */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Statut Paiement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <Badge className={`text-base px-3 py-1 ${getStatusColor(sale.status)} border-0`}>
                                {getStatusLabel(sale.status)}
                            </Badge>
                            <Button size="sm" variant="outline" className="h-8 gap-2" onClick={() => setShowPaymentDialog(true)}>
                                <CreditCard className="h-3.5 w-3.5" />
                                Gérer Paiements
                            </Button>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                            Mode: <span className="font-medium text-foreground capitalize">{sale.paymentHistory?.[0]?.method || 'N/A'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Client Info Card */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Informations Client</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-lg">
                                    <User className="h-5 w-5 text-blue-600" />
                                    {client ? (
                                        <span>{client.nom ? `${client.prenom} ${client.nom}` : client.name}</span>
                                    ) : (
                                        <span className="italic text-muted-foreground">
                                            {sale.clientName || 'Client Anonyme'}
                                        </span>
                                    )}
                                </div>
                                {client ? (
                                    <div className="flex gap-6 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            {client.telephone1 || client.phone || 'N/A'}
                                        </div>
                                        {(client.assuranceId || client.mutuelle) && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Building2 className="h-4 w-4" />
                                                {client.assuranceId || client.mutuelle}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                     <div className="flex gap-6 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            {sale.clientPhone || 'N/A'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle: Items Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Articles Achetés
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                                <tr>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Article</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Réf</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Prix U.</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Qté</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items?.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="p-3 font-medium">{item.productName || item.nomProduit || 'Produit sans nom'}</td>
                                        <td className="p-3 text-muted-foreground">{item.productRef || item.reference || '-'}</td>
                                        <td className="p-3 text-right">{(item.unitPrice || item.prixVente || 0).toFixed(2)} DH</td>
                                        <td className="p-3 text-right">{item.quantity}</td>
                                        <td className="p-3 text-right font-semibold">{(item.total || ((item.unitPrice || item.price || 0) * item.quantity)).toFixed(2)} DH</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom: Financial Summary */}
            <div className="flex justify-end">
                <Card className="w-full md:w-1/3">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4">
                        <CardTitle className="text-lg">Résumé Financier</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Total HT</span>
                            <span>{totalHT.toFixed(2)} DH</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>TVA (20%)</span>
                            <span>{totalTVA.toFixed(2)} DH</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-xl font-bold">
                            <span>Total TTC</span>
                            <span>{totalTTC.toFixed(2)} DH</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 text-green-600 font-medium">
                            <span>Avance / Payé</span>
                            <span>{sale.totalPaye.toFixed(2)} DH</span>
                        </div>
                        <div className={`flex justify-between text-lg font-bold border-t pt-2 ${sale.resteAPayer > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            <span>Reste à Payer</span>
                            <span>{sale.resteAPayer.toFixed(2)} DH</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
