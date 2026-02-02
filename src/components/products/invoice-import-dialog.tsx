'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InvoiceImportDialog() {
    const { toast } = useToast();

    return (
        <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
                toast({
                    title: "Maintenance",
                    description: "Cette fonctionnalité est désactivée pendant la migration SQL.",
                    variant: "destructive"
                });
            }}
        >
            <Camera className="h-4 w-4" />
            Scanner Facture (Maintenance)
        </Button>
    );
}
