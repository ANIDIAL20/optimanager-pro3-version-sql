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

    // Unified Print Handling (The "Master" Source)
    const handlePrint = () => {
        setShowPrintPreview(true);
    };

    // Unified Download/Share (Use Print Page -> Save as PDF)
    const handleDownload = () => {
        // Open print page in new tab with auto-print
        const url = `/print/facture/${sale.id}?auto=true`;
        window.open(url, '_blank');
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

                    <DropdownMenuItem onClick={() => {
                        window.open(`/api/factures/${sale.id}/pdf`, '_blank');
                    }}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Télécharger (PDF)</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleShare}>
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
