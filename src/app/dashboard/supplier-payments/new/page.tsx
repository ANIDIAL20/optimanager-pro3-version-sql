import { SupplierPaymentForm } from '@/components/dashboard/supplier-payments/supplier-payment-form';
import { Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewSupplierPaymentPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                  <Link href="/dashboard/supplier-payments">
                      <ArrowLeft className="h-5 w-5 text-slate-500" />
                  </Link>
              </Button>
              <div>
                  <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                          <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                              <Wallet className="h-6 w-6" />
                          </div>
                          Nouveau Règlement
                      </h1>
                  </div>
                  <p className="text-slate-500 ml-1">Enregistrez un paiement sortant vers un fournisseur</p>
              </div>
          </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <SupplierPaymentForm />
      </div>
    </div>
  );
}
