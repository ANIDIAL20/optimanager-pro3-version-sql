'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Client, Sale, OrderDetail } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Invoice } from '@/app/clients/[id]/_components/invoice';

interface SaleWithDetails extends Sale {
    details: OrderDetail[];
}

export default function StandaloneInvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const saleId = params.id as string;
    const clientId = searchParams.get('clientId');

    const firestore = useFirestore();

    // Fetch Sale
    const saleRef = useMemoFirebase(
        () => (firestore && saleId ? doc(firestore, 'sales', saleId) : null),
        [firestore, saleId]
    );
    const { data: sale, isLoading: isLoadingSale, error: errorSale } = useDoc<Sale>(saleRef);

    // Fetch Sale Details
    const saleDetailsQuery = useMemoFirebase(
        () => (firestore && saleId ? collection(firestore, `sales/${saleId}/orderDetails`) : null),
        [firestore, saleId]
    );
    const { data: saleDetails, isLoading: isLoadingDetails, error: errorDetails } = useCollection<OrderDetail>(saleDetailsQuery);

    // Fetch Client
    // The client ID is now taken from the query parameter
    const clientRef = useMemoFirebase(
        () => (firestore && clientId ? doc(firestore, 'clients', clientId) : null),
        [firestore, clientId]
    );
    const { data: client, isLoading: isLoadingClient, error: errorClient } = useDoc<Client>(clientRef);


    const isLoading = isLoadingSale || isLoadingDetails || isLoadingClient;
    const error = errorSale || errorDetails || errorClient;

    if (isLoading) {
        return <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8"><Skeleton className="h-[800px] w-full" /></div>;
    }

    if (error) {
        return <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8"><Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
                Impossible de charger la facture. Le lien est peut-être incorrect ou les données ont été supprimées.
                Error: {error.message}
            </AlertDescription>
        </Alert></div>
    }

    if (!sale || !saleDetails || !client) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Facture non trouvée</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Les informations pour cette facture n'ont pas pu être trouvées.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const saleWithDetails: SaleWithDetails = {
        ...sale,
        details: saleDetails,
        ...({} as any), // Type compatibility workaround if needed, though interface looks okay
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <Invoice sale={saleWithDetails} client={client} />
        </div>
    );
}
