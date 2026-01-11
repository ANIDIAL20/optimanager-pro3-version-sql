'use client';

import * as React from 'react';
import { getDevisById, convertDevisToSale, Devis } from '@/app/actions/devis-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/ui/back-button';
import { PageHeader } from '@/components/page-header';

interface DevisDetailsPageProps {
    params: Promise<{ id: string }>;
}

export default function DevisDetailsPage({ params }: DevisDetailsPageProps) {
    const { id } = React.use(params);
    const { toast } = useToast();
    const router = useRouter();

    const [devis, setDevis] = React.useState<Devis | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isConverting, setIsConverting] = React.useState(false);

    const loadDevis = React.useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const result = await getDevisById(id);
        if (result.success && result.devis) {
            setDevis(result.devis);
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!devis) return null;

    const handlePrint = () => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `/dashboard/devis/${devis.id}/print`;
        document.body.appendChild(iframe);

        iframe.onload = () => {
            if (iframe.contentWindow) {
                iframe.contentWindow.print();
            }
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
    };

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
                    <Button
                        variant="outline"
                        onClick={handlePrint}
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimer Devis
                    </Button>

                    {devis.status !== 'TRANSFORME' && (
                        <Button
                            onClick={handleConvert}
                            disabled={isConverting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isConverting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Transformer en Vente
                        </Button>
                    )}
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Client Info */}
                <Card className="col-span-3 md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-md text-muted-foreground">Client</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-semibold mb-1">{devis.clientName}</div>
                        <div className="text-sm text-muted-foreground">{devis.clientPhone}</div>
                    </CardContent>
                </Card>

                {/* Items List */}
                <Card className="col-span-3 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-md text-muted-foreground">Détails</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 font-medium">
                                    <tr>
                                        <th className="p-3">Désignation</th>
                                        <th className="p-3 text-right">Qté</th>
                                        <th className="p-3 text-right">Prix U.</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devis.items.map((item, idx) => (
                                        <tr key={idx} className="border-t last:border-0 border-muted">
                                            <td className="p-3">
                                                <div className="font-medium">{item.designation}</div>
                                                {item.reference && <div className="text-xs text-muted-foreground">{item.reference}</div>}
                                            </td>
                                            <td className="p-3 text-right">{item.quantite}</td>
                                            <td className="p-3 text-right">{item.prixUnitaire.toFixed(2)}</td>
                                            <td className="p-3 text-right font-medium">
                                                {(item.quantite * item.prixUnitaire).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-1/2 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total HT</span>
                                    <span>{devis.totalHT.toFixed(2)} DH</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">TVA (20%)</span>
                                    <span>{(devis.totalTTC - devis.totalHT).toFixed(2)} DH</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Total TTC</span>
                                    <span className="text-blue-600">{devis.totalTTC.toFixed(2)} DH</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
