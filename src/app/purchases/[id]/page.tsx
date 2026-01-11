import { Suspense } from "react";
import PurchaseView from "./client-view";

export function generateStaticParams() {
  return [{ id: "static" }];
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading purchase...</div>}>
      <PurchaseView />
    </Suspense>
  );
}
