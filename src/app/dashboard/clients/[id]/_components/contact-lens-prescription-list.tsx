'use client';

import * as React from 'react';
import { getContactLensPrescriptions } from '@/app/actions/contact-lens-prescriptions-actions';
import type { ContactLensPrescription } from '@/app/actions/contact-lens-prescriptions-actions';
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

interface ContactLensPrescriptionListProps {
  clientId: string;
}

export function ContactLensPrescriptionList({ clientId }: ContactLensPrescriptionListProps) {
  const [prescriptions, setPrescriptions] = React.useState<ContactLensPrescription[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadPrescriptions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getContactLensPrescriptions(clientId);
        if (result.success && result.data) {
          setPrescriptions(result.data);
        } else {
          setError('Impossible de charger les prescriptions');
        }
      } catch (err) {
        setError('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrescriptions();
  }, [clientId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Prescriptions Lentilles</CardTitle>
        <CardDescription>
          Liste de toutes les prescriptions de lentilles de contact pour ce client.
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
              Impossible de charger l'historique des prescriptions.
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && prescriptions && prescriptions.length === 0 && (
          <div className="text-center text-muted-foreground py-6">
            Aucune prescription de lentilles trouvée pour ce client.
          </div>
        )}
        {!isLoading && prescriptions && prescriptions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Prescripteur</TableHead>
                <TableHead>Durée/Exp</TableHead>
                <TableHead>OD Sph/BC/Dia</TableHead>
                <TableHead>OG Sph/BC/Dia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((p) => {
                const data = p.data as any; // Type assertion for JSON data
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>{data?.lensType || '-'}</TableCell>
                    <TableCell>{data?.brand || '-'}</TableCell>
                    <TableCell>{data?.doctorName || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>{data?.duration || '-'}</span>
                        <span className="text-muted-foreground">{data?.expirationDate ? format(new Date(data.expirationDate), 'dd/MM/yyyy') : '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{`${data?.rightEye?.power || '-'} / ${data?.rightEye?.baseCurve || '-'} / ${data?.rightEye?.diameter || '-'}`}</TableCell>
                    <TableCell>{`${data?.leftEye?.power || '-'} / ${data?.leftEye?.baseCurve || '-'} / ${data?.leftEye?.diameter || '-'}`}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
