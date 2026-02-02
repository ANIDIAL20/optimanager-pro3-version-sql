'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SmartInvoiceImporter() {
    const { toast } = useToast();

    return (
        <Button 
            variant="outline" 
            className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200"
            onClick={() => {
                toast({
                    title: "Maintenance",
                    description: "Cette fonctionnalité est désactivée pendant la migration SQL.",
                    variant: "destructive"
                });
            }}
        >
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                Importer via IA (Maintenance)
            </span>
        </Button>
    );
}
