'use client';

import * as React from 'react';
import { getDevisById, convertDevisToSale, Devis } from '@/app/actions/devis-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User, Phone, Building2, Receipt, Clock, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/ui/back-button';
import { PageHeader } from '@/components/page-header';
import { QuoteActions } from '@/components/quotes/quote-actions';
import { getShopProfile } from '@/app/actions/shop-actions';
import { Separator } from '@/components/ui/separator';
import { BrandLoader } from '@/components/ui/loader-brand';

interface DevisDetailsPageProps {
    params: Promise<{ id: string }>;
}

export default function DevisDetailsPage({ params }: DevisDetailsPageProps) {
    const { id } = React.use(params);
    const { toast } = useToast();
    const router = useRouter();

    const [devis, setDevis] = React.useState<Devis | null>(null);
    const [shopSettings, setShopSettings] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isConverting, setIsConverting] = React.useState(false);

    const loadDevis = React.useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const result = await getDevisById(id);
        if (result.success && result.devis) {
            setDevis(result.devis);

            // Fetch shop settings for PDF actions
            try {
                 const settings = await getShopProfile();
                 if (settings) setShopSettings(settings);
            } catch (e) {
                console.error("Failed to load shop settings", e);
            }
        } else {
            toast({
                title: "Erreur",
                description: "Devis introuvable",
                variant: "destructive"
            });
            router.push('/dashboard/devis');
        }
        setIsLoading(false);
    }, [id, toast, router]);

    React.useEffect(() => {
        loadDevis();
    }, [loadDevis]);

    const handleConvert = async () => {
        if (!devis || !devis.id) return;

        if (!confirm("Voulez-vous transformer ce devis en vente ? Cette action déduira le stock.")) {
            return;
        }

        setIsConverting(true);
        try {
            const result = await convertDevisToSale(devis.id);
            if (result.success && result.saleId) {
                toast({
                    title: "✅ Succès",
                    description: "Devis transformé en vente avec succès.",
                });
                // Redirect to new sale
                router.push(`/dashboard/ventes/${result.saleId}`);
            } else {
                toast({
                    title: "❌ Erreur",
                    description: result.error || "Erreur inconnue",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "❌ Erreur",
                description: "Erreur lors de la conversion",
                variant: "destructive"
            });
        } finally {
            setIsConverting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'VALIDE': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'TRANSFORME': return 'bg-green-100 text-green-800 border-green-200';
            case 'REFUSE': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-orange-100 text-orange-800 border-orange-200';
        }
    };
    
    const getStatusLabel = (status: string) => {
         switch (status) {
            case 'VALIDE': return 'Validé';
            case 'TRANSFORME': return 'Transformé';
            case 'REFUSE': return 'Refusé';
            default: return 'En Attente';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <BrandLoader size="md" />
            </div>
        );
    }
    
    if (!devis) return null;

    return (
        <div className="flex flex-1 flex-col gap-6">

            {/* Back Button */}
            <div className="w-fit">
                <BackButton />
            </div>

            {/* Header */}
            <PageHeader
                title={`Devis #${devis.id?.slice(0, 8).toUpperCase()}`}
                description={`Du ${new Date(devis.createdAt).toLocaleDateString('fr-FR')}`}
            >
                <div className="flex items-center gap-2">
                    {devis.status === 'TRANSFORME' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mr-2">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Transformé
                        </Badge>
                    )}
                    {/* Quote Actions Dropdown */}
                    {shopSettings && (
                        <QuoteActions devis={devis} shopSettings={shopSettings} />
                    )}

                    {devis.status !== 'TRANSFORME' && (
                        <Button
                            onClick={handleConvert}
                            disabled={isConverting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isConverting ? (
                                <BrandLoader size="sm" className="mr-2" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Transformer en Vente
                        </Button>
                    )}
                </div>
            </PageHeader>
            
            {/* Top Cards: Status & Client */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Card (Mimicking Payment Status) */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Statut Devis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <Badge className={`text-base px-3 py-1 ${getStatusColor(devis.status || 'EN_ATTENTE')} border-0`}>
                                {getStatusLabel(devis.status || 'EN_ATTENTE')}
                            </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                           <Clock className="h-4 w-4" />
                           <span className="font-medium text-foreground">
                                Créé le {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                           </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Client Info Card (Aligned with Ventes) */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Informations Client</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-lg">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <span>{devis.clientName || 'Client Inconnu'}</span>
                                </div>
                                <div className="flex gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        {devis.clientPhone || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Building2 className="h-4 w-4" />
                                        <span>Client</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Items List (Full Width) */}
            <Card>
                <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Détails du Devis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                                <tr>
                                    <th className="p-3 font-medium text-muted-foreground">Désignation</th>
                                    <th className="p-3 text-right font-medium text-muted-foreground">Qté</th>
                                    <th className="p-3 text-right font-medium text-muted-foreground">Prix U.</th>
                                    <th className="p-3 text-right font-medium text-muted-foreground">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devis.items.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="p-3">
                                            <div className="font-medium">{item.designation}</div>
                                            {item.reference && <div className="text-xs text-muted-foreground">{item.reference}</div>}
                                        </td>
                                        <td className="p-3 text-right">{item.quantite}</td>
                                        <td className="p-3 text-right">{item.prixUnitaire.toFixed(2)} DH</td>
                                        <td className="p-3 text-right font-semibold">
                                            {(item.quantite * item.prixUnitaire).toFixed(2)} DH
                                        </td>
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
                            <span>{devis.totalHT.toFixed(2)} DH</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>TVA (20%)</span>
                            <span>{(devis.totalTTC - devis.totalHT).toFixed(2)} DH</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-xl font-bold">
                            <span>Total TTC</span>
                            <span>{devis.totalTTC.toFixed(2)} DH</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
        </div>
    );
}
