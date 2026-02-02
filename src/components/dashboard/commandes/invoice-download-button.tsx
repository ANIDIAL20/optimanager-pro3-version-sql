'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Sale } from '@/lib/types';

interface InvoiceDownloadButtonProps {
    sale: Sale;
    onClick?: () => void;
}

export function InvoiceDownloadButton({ sale, onClick }: InvoiceDownloadButtonProps) {
    const { toast } = useToast();

    return (
        <div 
            onClick={() => {
                if (onClick) onClick();
                toast({
                    title: "Maintenance",
                    description: "Le téléchargement est désactivé le temps de la migration.",
                    variant: "destructive"
                });
            }} 
            className="flex items-center w-full cursor-pointer text-slate-500 hover:text-slate-700"
        >
            <FileText className="mr-2 h-4 w-4" />
            Télécharger Facture (Maintenance)
        </div>
    );
}
