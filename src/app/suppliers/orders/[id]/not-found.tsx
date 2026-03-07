import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';

export default function SupplierOrderNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
        <Truck className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Commande Introuvable</h2>
      <p className="text-slate-500 max-w-md mx-auto mb-8">
        La commande que vous cherchez n'existe pas ou le format de l'identifiant est invalide (un nouveau format sécurisé UUID a été déployé).
      </p>
      <Link href="/dashboard/supplier-orders">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Retour aux commandes fournisseurs
        </Button>
      </Link>
    </div>
  );
}
