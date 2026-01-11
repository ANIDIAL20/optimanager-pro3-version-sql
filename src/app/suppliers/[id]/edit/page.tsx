'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useFirebase } from '@/firebase';
import type { Supplier } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { SupplierForm } from '../../_components/supplier-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

import { BackButton } from '@/components/ui/back-button';

export default function EditSupplierPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { user } = useFirebase();

  const supplierId = params.id as string;

  const supplierRef = React.useMemo(
    () =>
      firestore && user
        ? doc(firestore, `stores/${user.uid}/suppliers`, supplierId)
        : null,
    [firestore, user, supplierId]
  );

  const { data: supplier, isLoading, error } = useDoc<Supplier>(supplierRef);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger les informations du fournisseur. Le fournisseur n'existe peut-être pas.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="w-fit">
        <BackButton />
      </div>
      <PageHeader
        title="Modifier le Fournisseur"
        description={`Modifiez les informations de ${supplier.nomCommercial}`}
      />
      <SupplierForm supplier={supplier} />
    </div>
  );
}
