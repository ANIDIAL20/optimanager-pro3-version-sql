
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
        title="Add New Product"
        description="Fill in the details to add a new product to the catalog."
      />
      <ProductForm />
    </div>
  );
}
