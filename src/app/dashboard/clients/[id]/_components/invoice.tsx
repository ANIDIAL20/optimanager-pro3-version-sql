'use client';

import React from 'react';
import type { Client, OrderDetail, Sale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';

interface SaleWithDetails extends Sale {
  details: OrderDetail[];
}

interface InvoiceProps {
  sale: SaleWithDetails;
  client: Client;
}

export function Invoice({ sale, client }: InvoiceProps) {
  const { toast } = useToast();

  // All print/PDF actions now route through the unified print page
  const handlePrint = () => {
    window.open(`/print/facture/${sale.id}`, '_blank');
  };

  const handleDownloadPdf = () => {
    window.open(`/print/facture/${sale.id}?autoprint=true`, '_blank');
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/print/facture/${sale.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Lien copié !',
      description: 'Le lien vers la facture a été copié dans le presse-papiers.',
    });
  };

  return (
    <div className="bg-background rounded-lg">
      <div className="p-8 text-black bg-white">
        <header className="flex justify-between items-start pb-6 border-b">
          <div>
            <Logo />
            <p className="text-sm mt-2">OptiManager Pro</p>
            <p className="text-xs text-gray-500">123 Rue de la Vision, 75001 Paris</p>
            <p className="text-xs text-gray-500">contact@optimanager.pro</p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-gray-800">FACTURE</h1>
            <p className="text-gray-500"># {sale.id.slice(0, 6)}</p>
            <p className="text-gray-500 mt-2">Date: {format(new Date(sale.date), 'dd/MM/yyyy')}</p>
          </div>
        </header>

        <section className="my-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Facturé à</h2>
          <p className="font-bold">{client.prenom} {client.nom}</p>
          <p>{client.adresse}</p>
          <p>{client.ville}</p>
          <p>{client.telephone1}</p>
        </section>

        <section>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-sm font-semibold">Produit</th>
                <th className="p-3 text-sm font-semibold text-center">Quantité</th>
                <th className="p-3 text-sm font-semibold text-right">Prix Unitaire</th>
                <th className="p-3 text-sm font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.details.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.nom}</td>
                  <td className="p-3 text-center">{item.quantite}</td>
                  <td className="p-3 text-right">
                    <SensitiveData value={item.prix} type="currency" />
                  </td>
                  <td className="p-3 text-right">
                    <SensitiveData value={item.prix * item.quantite} type="currency" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end mt-6">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total:</span>
              <span><SensitiveData value={sale.totalNet || 0} type="currency" /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TVA (0%):</span>
              <span>0.00 MAD</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Net:</span>
              <span><SensitiveData value={sale.totalNet || 0} type="currency" /></span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Montant Payé:</span>
              <span><SensitiveData value={sale.totalPaye || 0} type="currency" /></span>
            </div>
            <div className="flex justify-between font-semibold text-red-600">
              <span>Reste à Payer:</span>
              <span><SensitiveData value={sale.resteAPayer || 0} type="currency" className="text-red-600" /></span>
            </div>
          </div>
        </section>

        {/* Amount in Words - Moroccan Invoice Standard */}
        <section className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
          <p className="text-sm text-gray-600 mb-2">
            Arrêté la présente facture à la somme de :
          </p>
          <p className="text-base font-bold uppercase tracking-wide text-gray-900">
            {formatCurrencyToWords(sale.totalNet || 0)}
          </p>
        </section>

        <footer className="text-center text-xs text-gray-400 mt-12 pt-4 border-t">
          <p>Merci de votre confiance.</p>
          <p>OptiManager Pro - Votre partenaire vision</p>
        </footer>
      </div>
      <div className="p-4 bg-muted flex justify-end gap-2">
        <Button variant="outline" onClick={handleShare}><Share2 className="mr-2" /> Partager</Button>
        <Button variant="outline" onClick={handlePrint}><Printer className="mr-2" /> Imprimer</Button>
        <Button onClick={handleDownloadPdf}><Download className="mr-2" /> Télécharger PDF</Button>
      </div>
    </div>
  );
}
