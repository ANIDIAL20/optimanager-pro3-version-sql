'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function PurchaseClientView() {
    return (
        <div className="space-y-6">
            <PageHeader title="Détails de la commande" description="Visualisation en maintenance" />
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Maintenance</AlertTitle>
                <AlertDescription>
                   La visualisation des commandes est temporairement désactivée pour migration.
                </AlertDescription>
            </Alert>
            <Skeleton className="h-[300px] w-full" />
        </div>
    );
}
