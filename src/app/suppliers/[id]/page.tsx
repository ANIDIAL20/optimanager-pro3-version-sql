import { Suspense } from "react";
import SupplierView from "./client-view";
import { getSupplier } from "@/app/actions/supplier-actions";

import { BrandLoader } from '@/components/ui/loader-brand';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(id);

  return (
    <Suspense fallback={<BrandLoader size="lg" className="mx-auto my-12" />}>
      <SupplierView supplier={supplier} />
    </Suspense>
  );
}
