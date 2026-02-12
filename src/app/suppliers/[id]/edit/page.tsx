import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSupplier } from '@/app/actions/supplier-actions';
import { SupplierForm } from '../../_components/supplier-form';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck } from "lucide-react";
import Link from "next/link";
import { Skeleton } from '@/components/ui/skeleton';

export default async function EditSupplierPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supplierRaw = await getSupplier(params.id);

  if (!supplierRaw) {
    notFound();
  }

  // Map DB fields to Form fields if necessary
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
    typeProduits: supplierRaw.category ? supplierRaw.category.split(', ') : [],
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                  <Link href={`/suppliers/${params.id}`}>
                      <ArrowLeft className="h-5 w-5 text-slate-500" />
                  </Link>
              </Button>
              <div>
                  <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                              <Truck className="h-6 w-6" />
                          </div>
                          Modifier le Fournisseur
                      </h1>
                  </div>
                  <p className="text-slate-500 ml-1">Modifiez les informations de {supplier.nomCommercial}</p>
              </div>
          </div>
      </div>
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
