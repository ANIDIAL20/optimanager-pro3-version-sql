'use client';

import * as React from 'react';
import { FileText, Printer, Download, Share2, ArrowDown } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
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
// import { QuotePDF } from './quote-pdf';
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

// Force HMR Update
export function QuoteActions({ devis, shopSettings, client }: QuoteActionsProps) {
    const [showPrintPreview, setShowPrintPreview] = React.useState(false);
    const { toast } = useToast();

    // ✅ UPDATED
    const handlePreviewLatestDesign = () => {
        window.open(`/api/devis/${devis.id}/pdf?latest=true`, '_blank');
    };

    // Unified Print Handling (The "Master" Source)
    const handlePrint = () => {
        setShowPrintPreview(true);
    };

    // Unified Download/Share (Use Print Page -> Save as PDF)
    const handleDownload = () => {
        // Open print page in new tab with auto-print
        const url = `/print/devis/${devis.id}?auto=true`;
        window.open(url, '_blank');
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/print/devis/${devis.id}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Devis #${devis.id?.substring(0, 8)}`,
                    text: `Devis pour ${devis.clientName}`,
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
                toast({ title: 'Lien copié', description: 'Le lien vers le devis a été copié.' });
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
                        Actions Devis
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions Devis</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        <span>Imprimer</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handlePreviewLatestDesign}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Aperçu (design actuel)</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => {
                        window.open(`/api/devis/${devis.id}/pdf`, '_blank');
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
                url={`/print/devis/${devis.id}?preview=true`}
                title={`Devis #${devis.id?.slice(0, 8).toUpperCase()}`}
            />
        </>
    );
}
