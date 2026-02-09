import { SupplierPaymentForm } from '@/components/dashboard/supplier-payments/supplier-payment-form';
import { Wallet } from 'lucide-react';

export default function NewSupplierPaymentPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          Nouveau Règlement
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl">
          Enregistrez un paiement sortant vers un fournisseur et affectez-le à des commandes.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <SupplierPaymentForm />
      </div>
    </div>
  );
}
