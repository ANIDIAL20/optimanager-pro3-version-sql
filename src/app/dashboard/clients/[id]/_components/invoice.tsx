'use client';

import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode.react';
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
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const data = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(data);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`facture-${sale.id.slice(0, 6)}.pdf`);
  };

  const handlePrint = () => {
    const printContents = invoiceRef.current?.innerHTML;
    const originalContents = document.body.innerHTML;
    if (!printContents) return;

    // Temporarily replace the body with the invoice content
    document.body.innerHTML = printContents;
    window.print();
    // Restore the original content
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to re-apply scripts and styles
  }

  const handleShare = () => {
    // Use origin to construct a clean shareable URL
    const shareUrl = `${window.location.origin}/clients/${client.id}/invoice/${sale.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Lien copié !",
      description: "Le lien vers la facture a été copié dans le presse-papiers.",
    })
  }

  const getShareableQRCodeValue = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/clients/${client.id}/invoice/${sale.id}`;
    }
    return '';
  }


  return (
    <div className="bg-background rounded-lg">
      <div ref={invoiceRef} className="p-8 text-black bg-white">
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

        <section className="grid grid-cols-2 gap-4 my-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Facturé à</h2>
            <p className="font-bold">{client.prenom} {client.nom}</p>
            <p>{client.adresse}</p>
            <p>{client.ville}</p>
            <p>{client.telephone1}</p>
          </div>
          <div className="text-right">
            <QRCode value={getShareableQRCodeValue()} size={80} />
          </div>
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
