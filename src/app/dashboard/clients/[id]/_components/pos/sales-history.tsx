'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Sale } from '@/lib/types'; // Assuming Sale type exists and fits, if not we define local
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SalesHistoryProps {
    clientId: string;
}

export function SalesHistory({ clientId }: SalesHistoryProps) {
    const firestore = useFirestore();
    const { user } = useFirebase();

    const salesQuery = useMemoFirebase(
        () => {
            if (!firestore || !user) return null;
            return query(
                collection(firestore, `stores/${user.uid}/sales`),
                where('clientId', '==', clientId),
                // orderBy('date', 'desc'), 
            );
        },
        [firestore, user, clientId]
    );

    const { data: sales, isLoading, error } = useCollection<any>(salesQuery); // Using any to be safe on types initially

    if (isLoading) {
        return (
            <div className="space-y-2 mt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }

    if (error) {
        return <div className="text-destructive p-4">Erreur de chargement de l'historique : {error.message}</div>;
    }

    // Sort cliend-side to avoid "Index Required" errors during dev
    const sortedSales = sales?.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    }) || [];

    if (sortedSales.length === 0) {
        return <div className="text-muted-foreground p-4 text-center">Aucune vente enregistrée.</div>;
    }

    return (
        <div className="border rounded-md mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Payé</TableHead>
                        <TableHead className="text-right">Reste</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedSales.map((sale) => (
                        <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                                {sale.date ? format(new Date(sale.date), 'dd MMM yyyy HH:mm', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell className="text-right">{Number(sale.totalNet || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{Number(sale.totalPaye || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold text-destructive">
                                {Number(sale.resteAPayer || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                                {(sale.resteAPayer || 0) <= 0.01 ? (
                                    <Badge className="bg-green-600">Payé</Badge>
                                ) : (
                                    <Badge variant="destructive">Impayé</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
