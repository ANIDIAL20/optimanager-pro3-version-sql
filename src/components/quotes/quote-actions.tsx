'use client';

import * as React from 'react';
import { FileText, Printer, Download, Share2, Loader2, ArrowDown } from 'lucide-react';
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
import { QuotePDF } from './quote-pdf';
import type { Devis } from '@/app/actions/devis-actions';
import type { Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintPreviewDialog } from '@/components/printing/print-preview-dialog';

interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
}

interface QuoteActionsProps {
    devis: Devis;
    shopSettings: ShopSettings;
    client?: Client; // Optional full client details
}

export function QuoteActions({ devis, shopSettings, client }: QuoteActionsProps) {
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const { toast } = useToast();

    // Generate PDF blob
    const generatePDFBlob = async (): Promise<Blob | null> => {
        try {
            setIsGenerating(true);

            // Create PDF document
            const doc = <QuotePDF devis={devis} shopSettings={shopSettings} client={client} />;

            // Generate blob
            const asPdf = pdf(doc);
            const blob = await asPdf.toBlob();

            return blob;
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de générer le devis PDF.',
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
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `devis-${devis.id?.substring(0, 8) || 'quote'}.pdf`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: 'Téléchargement réussi',
                description: 'Le devis a été téléchargé.',
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Échec du téléchargement.',
            });
        }
    };

    // Share handler
    const handleShare = async () => {
        const blob = await generatePDFBlob();
        if (!blob) return;

        try {
            if (navigator.share && navigator.canShare) {
                const file = new File(
                    [blob],
                    `devis-${devis.id?.substring(0, 8) || 'quote'}.pdf`,
                    { type: 'application/pdf' }
                );

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Devis',
                        text: `Devis pour ${devis.clientName}`,
                        files: [file],
                    });
                    return;
                }
            }
            
            // Fallback: Open in new tab
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000);

        } catch (error) {
            console.error('Error sharing PDF:', error);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isGenerating}>
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FileText className="mr-2 h-4 w-4" />
                        )}
                        Actions Devis
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                url={`/print/devis/${devis.id}?preview=true`}
                title={`Devis #${devis.id?.slice(0, 8).toUpperCase()}`}
            />
        </>
    );
}
