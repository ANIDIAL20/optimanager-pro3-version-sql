import { Suspense } from "react";
import ClientView from "./client-view";

export function generateStaticParams() {
  return [{ id: "static" }];
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <ClientView />
    </Suspense>
  );
}
