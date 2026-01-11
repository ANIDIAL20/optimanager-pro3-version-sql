import { Suspense } from "react";
import InvoiceView from "./client-view";

export function generateStaticParams() {
  return [{ id: "static" }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<div>Loading invoice...</div>}>
      <InvoiceView params={resolvedParams} />
    </Suspense>
  );
}
