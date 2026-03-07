import { Suspense } from "react";
import SupplierView from "./client-view";
import { getSupplier } from "@/app/actions/supplier-actions";
import { getSupplierOrders } from "@/app/actions/supplier-orders-actions";
import { getSupplierPayments, getSupplierAvailableCredit } from "@/app/actions/supplier-payments-actions";
import { getSupplierCredits } from "@/app/actions/supplier-credits-actions";
import { getSupplierLensOrders } from "@/app/actions/lens-orders-actions";
import { BrandLoader } from '@/components/ui/loader-brand';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Parallel Fetching
  const [supplier, ordersRes, paymentsRes, lensOrdersRes, availableCredit, creditsRes] = await Promise.all([
    getSupplier(id),
    getSupplierOrders(id), 
    getSupplierPayments(id),
    getSupplierLensOrders(id),
    getSupplierAvailableCredit(id),
    getSupplierCredits(id)
  ]);

  const orders = ordersRes.success ? ordersRes.orders : [];
  const payments = paymentsRes.success ? paymentsRes.payments : [];
  const lensOrders = lensOrdersRes.success ? lensOrdersRes.data : [];
  const credits = creditsRes.success ? creditsRes.credits : [];

  return (
    <Suspense fallback={<BrandLoader size="lg" className="mx-auto my-12" />}>
      <SupplierView 
        supplier={supplier} 
        orders={orders}
        payments={payments}
        lensOrders={lensOrders}
        availableCredit={availableCredit}
        credits={credits}
      />
    </Suspense>
  );
}
