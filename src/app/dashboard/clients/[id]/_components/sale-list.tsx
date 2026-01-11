'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Sale } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface SaleListProps {
  clientId: string;
}

const getPaymentStatusBadge = (resteAPayer: number) => {
  if (resteAPayer <= 0) {
    return <Badge variant="default" className="bg-green-100 text-green-800">Payé</Badge>;
  }
  return <Badge variant="destructive">Non Payé</Badge>;
};

export function SaleList({ clientId }: SaleListProps) {
  const firestore = useFirestore();
  const { user } = useFirebase();
  const salesQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
          collection(firestore, `stores/${user.uid}/sales`),
          where('clientId', '==', clientId),
          orderBy('date', 'desc')
        )
        : null,
    [firestore, user, clientId]
  );

  const {
    data: sales,
    isLoading,
    error,
  } = useCollection<Sale>(salesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Ventes</CardTitle>
        <CardDescription>
          Liste de toutes les ventes pour ce client.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Impossible de charger l'historique des ventes.
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && sales && sales.length === 0 && (
          <div className="text-center text-muted-foreground py-6">
            Aucune vente trouvée pour ce client.
          </div>
        )}
        {!isLoading && sales && sales.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Total Net</TableHead>
                <TableHead>Total Payé</TableHead>
                <TableHead>Reste à Payer</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{(sale.totalNet || 0).toFixed(2)} MAD</TableCell>
                  <TableCell>{(sale.totalPaye || 0).toFixed(2)} MAD</TableCell>
                  <TableCell className="font-medium text-destructive">{(sale.resteAPayer || 0).toFixed(2)} MAD</TableCell>
                  <TableCell>{getPaymentStatusBadge(sale.resteAPayer || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
