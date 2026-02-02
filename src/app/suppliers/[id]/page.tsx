import { Suspense } from "react";
import SupplierView from "./client-view";
import { getSupplier } from "@/app/actions/supplier-actions";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supplier = await getSupplier(params.id);

  return (
    <Suspense fallback={<div>Chargement du fournisseur...</div>}>
      <SupplierView supplier={supplier} />
    </Suspense>
  );
}
