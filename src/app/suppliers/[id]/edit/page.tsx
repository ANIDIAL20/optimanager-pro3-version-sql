import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSupplier } from '@/app/actions/supplier-actions';
import { SupplierForm } from '../../_components/supplier-form';
import { PageHeader } from '@/components/page-header';
import { BackButton } from '@/components/ui/back-button';
import { Skeleton } from '@/components/ui/skeleton';

export default async function EditSupplierPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supplierRaw = await getSupplier(params.id);

  if (!supplierRaw) {
    notFound();
  }

  // Map DB fields to Form fields if necessary
  // The form expects 'nomCommercial', DB has 'name'.
  // DB has 'paymentTerms', form uses 'delaiPaiement' in schema but might accept 'paymentTerms' if we map it?
  // Actually SupplierForm:
  // defaultValues: supplier ? { ...supplier }
  // And it manages fields like 'delaiPaiement'.
  // If we pass 'paymentTerms' in supplier object, form won't pick it up for 'delaiPaiement' unless we map it.
  
  const supplier = {
    ...supplierRaw,
    nomCommercial: supplierRaw.name,
    email: supplierRaw.email,
    telephone: supplierRaw.phone,
    adresse: supplierRaw.address,
    ville: supplierRaw.city,
    delaiPaiement: supplierRaw.paymentTerms,
    modePaiement: supplierRaw.paymentMethod,
    banque: supplierRaw.bank,
    // typeProduits is stored as string "a, b" in DB category?
    // In actions/supplier-actions.ts createSupplier: category: data.typeProduits.join(', ')
    // So we need to split it back.
    typeProduits: supplierRaw.category ? supplierRaw.category.split(', ') : [],
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="w-fit">
        <BackButton />
      </div>
      <PageHeader
        title="Modifier le Fournisseur"
        description={`Modifiez les informations de ${supplier.nomCommercial}`}
      />
      <Suspense fallback={<EditSkeleton />}>
        <SupplierForm supplier={supplier} />
      </Suspense>
    </div>
  );
}

function EditSkeleton() {
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
