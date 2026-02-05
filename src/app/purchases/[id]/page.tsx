import { Suspense } from "react";
import PurchaseView from "./client-view";

export function generateStaticParams() {
  return [{ id: "static" }];
}

import { BrandLoader } from '@/components/ui/loader-brand';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<BrandLoader size="lg" className="mx-auto my-12" />}>
      <PurchaseView />
    </Suspense>
  );
}
