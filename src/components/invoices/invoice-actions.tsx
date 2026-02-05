'use client';

import * as React from 'react';
import { FileText, Printer, Download, Share2 } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { pdf } from '@react-pdf/renderer';
import { InvoicePDF } from './InvoicePDF';
import type { Sale, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintPreviewDialog } from '@/components/printing/print-preview-dialog';

// Shop settings type (matching InvoicePDF)
interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
}

interface InvoiceActionsProps {
    sale: Sale;
    client: Client;
    shopSettings: ShopSettings;
}

// Force HMR Update
export function InvoiceActions({ sale, client, shopSettings }: InvoiceActionsProps) {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const { toast } = useToast();

    // Generate PDF blob
    const generatePDFBlob = async (): Promise<Blob | null> => {
        try {
            setIsGenerating(true);

            // Create PDF document
            const doc = <InvoicePDF sale={sale} client={client} shopSettings={shopSettings} />;

            // Generate blob
            const asPdf = pdf(doc);
            const blob = await asPdf.toBlob();

            return blob;
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de générer la facture PDF.',
            });
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    // Print handler
    const handlePrint = () => {
        setShowPrintPreview(true);
    };

    // Download handler
    const handleDownload = async () => {
        const blob = await generatePDFBlob();
        if (!blob) return;

        try {
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `facture-${sale.id?.substring(0, 8) || 'invoice'}.pdf`;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);

            toast({
                title: 'Téléchargement réussi',
                description: 'La facture a été téléchargée avec succès.',
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de télécharger la facture.',
            });
        }
    };

    // Share handler
    const handleShare = async () => {
        const blob = await generatePDFBlob();
        if (!blob) return;

        try {
            // Check if Web Share API is supported
            if (navigator.share && navigator.canShare) {
                // Create file from blob
                const file = new File(
                    [blob],
                    `facture-${sale.id?.substring(0, 8) || 'invoice'}.pdf`,
                    { type: 'application/pdf' }
                );

                // Check if we can share this file
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Facture',
                        text: `Facture pour ${client.prenom} ${client.nom}`,
                        files: [file],
                    });

                    toast({
                        title: 'Partage réussi',
                        description: 'La facture a été partagée avec succès.',
                    });
                    return;
                }
            }

            // Fallback: Open PDF in new tab
            const url = URL.createObjectURL(blob);
            const shareWindow = window.open(url, '_blank');

            if (!shareWindow) {
                toast({
                    variant: 'destructive',
                    title: 'Bloqué',
                    description: 'Veuillez autoriser les pop-ups pour partager.',
                });
            }

            // Clean up URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error) {
            // User cancelled share or other error
            console.error('Error sharing PDF:', error);

            // Don't show error toast if user simply cancelled
            if (error instanceof Error && error.name !== 'AbortError') {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: 'Impossible de partager la facture.',
                });
            }
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isGenerating}>
                        {isGenerating ? (
                            <>
                                <BrandLoader size="xs" className="mr-2 inline-flex" />
                                Génération...
                                Facture
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" />
                                Actions Facture
                            </>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions Facture</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handlePrint} disabled={isGenerating}>
                        <Printer className="mr-2 h-4 w-4" />
                        <span>Imprimer</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleDownload} disabled={isGenerating}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Télécharger</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleShare} disabled={isGenerating}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Partager</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <PrintPreviewDialog
                open={showPrintPreview}
                onOpenChange={setShowPrintPreview}
                url={`/print/facture/${sale.id}?preview=true`}
                title={`Facture #${sale.saleNumber || sale.id?.substring(0, 8)}`}
            />
        </>
    );
}
