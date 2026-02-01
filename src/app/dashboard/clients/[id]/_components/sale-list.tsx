'use client';

import * as React from 'react';
import { getClientSales } from '@/app/actions/sales-actions';
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
import { SensitiveData } from '@/components/ui/sensitive-data';

interface SaleListProps {
  clientId: string;
}

const getPaymentStatusBadge = (resteAPayer: number) => {
  if (resteAPayer <= 0.01) {
    return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Payé</Badge>;
  }
  return <Badge variant="destructive">Non Payé</Badge>;
};

export function SaleList({ clientId }: SaleListProps) {
  const [sales, setSales] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchSales = async () => {
      setIsLoading(true);
      try {
        const res = await getClientSales(clientId);
        if (isMounted) {
            if (res.success && res.sales) {
                setSales(res.sales);
            } else {
                setError(res.error || "Erreur de chargement");
            }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSales();

    return () => { isMounted = false; };
  }, [clientId]);

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
              {error}
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
                  <TableCell>
                      {sale.date ? format(new Date(sale.date), 'dd/MM/yyyy HH:mm') : (
                          sale.createdAt ? format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm') : '-'
                      )}
                  </TableCell>
                  <TableCell>
                    <SensitiveData value={Number(sale.totalNet || sale.totalTTC || 0)} type="currency" />
                  </TableCell>
                  <TableCell>
                    <SensitiveData value={Number(sale.totalPaye || 0)} type="currency" />
                  </TableCell>
                  <TableCell className="font-medium text-destructive">
                    <SensitiveData value={Number(sale.resteAPayer || 0)} type="currency" className="text-destructive" />
                  </TableCell>
                  <TableCell>{getPaymentStatusBadge(Number(sale.resteAPayer || 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
