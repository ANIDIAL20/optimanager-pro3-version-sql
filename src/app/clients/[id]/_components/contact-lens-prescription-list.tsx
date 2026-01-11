'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { ContactLensPrescription } from '@/lib/types';
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
  const firestore = useFirestore();
  const { user } = useFirebase();
  const prescriptionsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
          collection(firestore, `stores/${user.uid}/clients/${clientId}/contact_lens_prescriptions`),
          orderBy('date', 'desc')
        )
        : null,
    [firestore, user, clientId]
  );

  const {
    data: prescriptions,
    isLoading,
    error,
  } = useCollection<ContactLensPrescription>(prescriptionsQuery);

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
                <TableHead>OD Sph/BC/Dia</TableHead>
                <TableHead>OG Sph/BC/Dia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{format(new Date(p.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{p.lensType}</TableCell>
                  <TableCell>{p.lensBrand || '-'}</TableCell>
                  <TableCell>{`${p.odSphere || '-'} / ${p.odBc || '-'} / ${p.odDia || '-'}`}</TableCell>
                  <TableCell>{`${p.ogSphere || '-'} / ${p.ogBc || '-'} / ${p.ogDia || '-'}`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
