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
// import { pdf } from '@react-pdf/renderer'; 
// import { InvoicePDF } from './InvoicePDF';
import type { Sale, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintPreviewDialog } from '@/components/printing/print-preview-dialog';
import { printInPlace } from '@/lib/print-in-place';
import { generateDocumentFilename } from '@/lib/pdf-filenames';
import { downloadPdfFromApi } from '@/lib/download-pdf';

// Shop settings type (matching InvoicePDF)
interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
    if?: string;
    rc?: string;
    tp?: string;
    inpe?: string;
}

interface InvoiceActionsProps {
    sale: Sale;
    client: Client;
    shopSettings: ShopSettings;
}

// Force HMR Update
export function InvoiceActions({ sale, client, shopSettings }: InvoiceActionsProps) {
    const router = useRouter();
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const { toast } = useToast();

    // Unified Print — uses iframe utility for same-page printing
    const handlePrint = () => {
        printInPlace(`/print/facture/${sale.id}`);
    };

    // PDF download — direct API route with attachment header
    const handleDownload = async () => {
        try {
            const url = `/api/factures/${sale.id}/pdf`;
            const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client';
            const reference = sale.saleNumber || String(sale.id);

            await downloadPdfFromApi(
                url,
                generateDocumentFilename('Facture', reference, clientName)
            );
            
            toast({ title: "Téléchargement terminé" });
        } catch (error) {
            console.error("Download error:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Le téléchargement a échoué.' 
            });
        }
    };

    // Aperçu design actuel — same URL, no autoprint
    const handlePreviewLatestDesign = () => {
        window.open(`/print/facture/${sale.id}`, '_blank', "noopener,noreferrer");
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/print/facture/${sale.id}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Facture #${sale.saleNumber || sale.id?.substring(0, 8)}`,
                    text: `Facture pour ${client.prenom} ${client.nom}`,
                    url: url
                });
                toast({ title: 'Lien partagé' });
            } catch (error) {
                console.error('Share failed:', error);
            }
        } else {
            // Fallback: Copy link
            try {
                await navigator.clipboard.writeText(url);
                toast({ title: 'Lien copié', description: 'Le lien vers la facture a été copié.' });
            } catch (err) {
                toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de copier le lien.' });
            }
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        Actions Facture
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions Facture</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        <span>Imprimer</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handlePreviewLatestDesign}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Aperçu (design actuel)</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Télécharger (PDF)</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Partager</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* PrintPreviewDialog kept for backward compatibility but no longer opened */}
        </>
    );
}
