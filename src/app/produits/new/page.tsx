
'use client';

import { PageHeader } from "@/components/page-header";
import { ProductForm } from "../_components/product-form";
import { BackButton } from "@/components/ui/back-button";

export default function AddProductPage() {
  return (
    <div className="flex flex-1 flex-col py-2">
      <ProductForm />
    </div>
  );
}
