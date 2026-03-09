'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Sale } from '@/lib/types';

import { generateDocumentFilename } from '@/lib/pdf-filenames';
import { downloadPdfFromApi } from '@/lib/download-pdf';

interface InvoiceDownloadButtonProps {
    sale: Sale;
    onClick?: () => void;
}

export function InvoiceDownloadButton({ sale, onClick }: InvoiceDownloadButtonProps) {
    const { toast } = useToast();

    const handleDownload = async (event: React.MouseEvent<HTMLDivElement>) => {
        try {
            event.preventDefault();
            event.stopPropagation();

            if (onClick) onClick();
            
            const url = `/api/factures/${sale.id}/pdf`;
            const clientName = `${sale.clientPrenom || ''} ${sale.clientNom || ''}`.trim() || 'Client';
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

    return (
        <div 
            role="button"
            tabIndex={0}
            onClick={handleDownload} 
            className="flex items-center w-full cursor-pointer text-slate-500 hover:text-slate-700"
        >
            <FileText className="mr-2 h-4 w-4" />
            Télécharger Facture (PDF)
        </div>
    );
}
