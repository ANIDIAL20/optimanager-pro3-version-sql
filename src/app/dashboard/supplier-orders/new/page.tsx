import { SupplierOrderForm } from '@/components/dashboard/supplier-orders/supplier-order-form';
import { PackageX, ShoppingCart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NewSupplierOrderPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Nouvelle Commande Fournisseur
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl">
          Créez un bon de commande détaillé. Les produits seront ajoutés au stock dès la réception.
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <SupplierOrderForm />
      </div>
    </div>
  );
}
