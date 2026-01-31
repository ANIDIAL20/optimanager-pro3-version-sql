
'use client';

import { PageHeader } from "@/components/page-header";
import { ProductForm } from "../_components/product-form";
import { BackButton } from "@/components/ui/back-button";

export default function AddProductPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="w-fit">
        <BackButton />
      </div>
      <PageHeader
        title="Ajouter un Produit"
        description="Remplissez les détails pour ajouter un nouveau produit au catalogue."
      />
      <ProductForm />
    </div>
  );
}
