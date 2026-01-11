'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Prescription } from '@/lib/types';
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

interface PrescriptionListProps {
  clientId: string;
}

export function PrescriptionList({ clientId }: PrescriptionListProps) {
  const firestore = useFirestore();
  const { user } = useFirebase();
  const prescriptionsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
          collection(firestore, `stores/${user.uid}/clients/${clientId}/prescriptions`),
          orderBy('date', 'desc')
        )
        : null,
    [firestore, user, clientId]
  );

  const {
    data: prescriptions,
    isLoading,
    error,
  } = useCollection<Prescription>(prescriptionsQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Mesures Lunettes</CardTitle>
        <CardDescription>
          Liste de toutes les prescriptions de lunettes enregistrées pour ce client.
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
            Aucune prescription de lunettes trouvée pour ce client.
          </div>
        )}
        {!isLoading && prescriptions && prescriptions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Prescripteur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>OD Sph/Cyl/Axe</TableHead>
                <TableHead>OG Sph/Cyl/Axe</TableHead>
                <TableHead>Add</TableHead>
                <TableHead>E.P.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{format(new Date(p.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{p.prescripteur}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{`${p.odSphere || '-'} / ${p.odCylindre || '-'} / ${p.odAxe || '-'}`}</TableCell>
                  <TableCell>{`${p.ogSphere || '-'} / ${p.ogCylindre || '-'} / ${p.ogAxe || '-'}`}</TableCell>
                  <TableCell>{`OD:${p.odAddition || '-'} | OG:${p.ogAddition || '-'}`}</TableCell>
                  <TableCell>{p.ecartPupillaire || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
