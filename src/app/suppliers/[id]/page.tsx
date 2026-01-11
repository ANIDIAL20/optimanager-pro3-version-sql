import { Suspense } from "react";
import SupplierView from "./client-view";

export function generateStaticParams() {
  return [{ id: "static" }];
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading supplier...</div>}>
      <SupplierView />
    </Suspense>
  );
}
