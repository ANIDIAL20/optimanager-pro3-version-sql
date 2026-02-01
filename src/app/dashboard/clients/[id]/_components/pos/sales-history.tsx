'use client';

import * as React from 'react';
import { getClientSales } from '@/app/actions/sales-actions';
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
    const [sales, setSales] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let isMounted = true;
        
        async function fetchSales() {
            setIsLoading(true);
            try {
                const res = await getClientSales(clientId);
                if (isMounted) {
                    if (res.success && res.sales) {
                        setSales(res.sales);
                    } else {
                        setError(res.error || "Erreur inconnue");
                    }
                }
            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchSales();

        return () => { isMounted = false };
    }, [clientId]);

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
        return <div className="text-destructive p-4">Erreur de chargement de l'historique : {error}</div>;
    }

    if (sales.length === 0) {
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
                    {sales.map((sale) => (
                        <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                                {sale.date ? format(new Date(sale.date), 'dd MMM yyyy HH:mm', { locale: fr }) : (
                                    sale.createdAt ? format(new Date(sale.createdAt), 'dd MMM yyyy HH:mm', { locale: fr }) : '-'
                                )}
                            </TableCell>
                            <TableCell className="text-right">{Number(sale.totalNet || sale.totalTTC || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{Number(sale.totalPaye || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold text-destructive">
                                {Number(sale.resteAPayer || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                                {(Number(sale.resteAPayer || 0)) <= 0.01 ? (
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
