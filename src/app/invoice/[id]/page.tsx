import { Suspense } from "react";
import InvoiceView from "./client-view";

export function generateStaticParams() {
  return [{ id: "static" }];
}

import { BrandLoader } from '@/components/ui/loader-brand';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return (
    <Suspense fallback={<BrandLoader size="lg" className="mx-auto my-12" />}>
      <InvoiceView />
    </Suspense>
  );
}
