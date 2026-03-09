'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatMAD } from '@/lib/format-currency';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';
import { formatOpticalValue } from '@/lib/format-optical';
import { DocumentPages, PageBadge, DOC_PAGINATION_CONFIG } from '@/hooks/use-document-pagination';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';

interface FacturePDFProps {
  data: StandardDocumentData;
  config: DocumentTemplateConfig;
}

export function FacturePDF({ data, config }: FacturePDFProps) {
  const primary = config.primaryColor;
  const secondary = config.secondaryColor;
  
  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return iso;
    }
  };

  const tvaBreakdown = React.useMemo(() => {
    const map: Record<number, { base: number; tax: number; ttc: number }> = {};
    for (const item of data.items) {
      const rawRate = Number(item.tvaRate);
      const rate = isNaN(rawRate) ? 20 : rawRate;
      const ttc = item.total;
      const base = ttc / (1 + rate / 100);
      const tax = ttc - base;
      if (!map[rate]) map[rate] = { base: 0, tax: 0, ttc: 0 };
      map[rate].base += base;
      map[rate].tax  += tax;
      map[rate].ttc  += ttc;
    }
    return Object.entries(map);
  }, [data.items]);

  return (
    <DocumentPages
      items={data.items}
      config={DOC_PAGINATION_CONFIG.facture}
      renderPage={(pageItems, { pageNumber, totalPages, isFirstPage, isLastPage }) => (
        <div className="flex flex-col h-full p-8 md:p-10 print:p-8">
          {/* HEADER */}
          {isFirstPage ? (
            <div className="mb-6 flex justify-between items-start border-b-2 pb-5" style={{ borderColor: primary }}>
              <div className="flex gap-4 items-start">
                {config.showLogo && data.shop.logoUrl && (
                  <div className="relative h-20 w-32 flex-shrink-0">
                    <Image src={data.shop.logoUrl} alt="Logo" fill className="object-contain" unoptimized />
                  </div>
                )}
                <div className="space-y-0.5">
                  <h1 className="text-lg font-bold uppercase tracking-wide leading-none" style={{ color: primary }}>{data.shop.nom}</h1>
                  <div className="text-[10px] leading-snug" style={{ color: secondary }}>
                    {data.shop.adresse && <p>{data.shop.adresse}</p>}
                    {data.shop.telephone && <p>Tél: {data.shop.telephone}</p>}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[9px]">
                      {data.shop.ice && <span>ICE: {data.shop.ice}</span>}
                      {data.shop.if_ && <span>IF: {data.shop.if_}</span>}
                      {data.shop.rc && <span>RC: {data.shop.rc}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block px-4 py-1.5 rounded mb-2 text-white" style={{ backgroundColor: primary }}>
                  <span className="text-base font-bold tracking-widest uppercase">FACTURE</span>
                </div>
                <div className="text-[10px] space-y-0.5">
                  <p className="font-semibold" style={{ color: primary }}>N° {data.documentNumber}</p>
                  <p style={{ color: secondary }}>Date : {formatDate(data.date)}</p>
                  {data.status && (
                    <p className="uppercase font-bold text-[9px] px-1.5 py-0.5 rounded inline-block mt-1 border"
                       style={{ backgroundColor: primary + '15', color: primary, borderColor: primary + '40' }}>
                      {data.status}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Reduced Header for other pages */
            <div className="mb-6 flex justify-between items-center border-b pb-3" style={{ borderColor: primary }}>
              <div className="flex items-center gap-3">
                {config.showLogo && data.shop.logoUrl && (
                  <div className="relative h-10 w-16 flex-shrink-0">
                    <Image src={data.shop.logoUrl} alt="Logo" fill className="object-contain" unoptimized />
                  </div>
                )}
                <h2 className="text-sm font-bold uppercase" style={{ color: primary }}>{data.shop.nom}</h2>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[10px] font-bold" style={{ color: primary }}>Facture N° {data.documentNumber}</p>
                <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
              </div>
            </div>
          )}

          {/* RECIPIENT BLOCK (Page 1 Only) */}
          {isFirstPage && data.client && (
            <div className="mb-6 flex justify-end">
              <div className="w-[50%] p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <h3 className="text-[9px] font-bold uppercase text-slate-500 mb-1 tracking-wider">Facturé à :</h3>
                <div className="text-xs text-slate-900">
                  <p className="font-bold mb-0.5">{data.client.nom}</p>
                  {data.client.telephone && <p className="text-[10px]">{data.client.telephone}</p>}
                  {data.client.adresse && <p className="text-[10px]">{data.client.adresse}</p>}
                  {data.client.mutuelle && <p className="text-[10px] text-blue-700 font-medium mt-1">Mutuelle : {data.client.mutuelle}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ITEMS TABLE */}
          <div className="flex-grow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: primary }}>
                  <th className="py-2 pl-2 text-left text-[9px] font-bold uppercase w-[40%] rounded-tl-sm">Désignation</th>
                  <th className="py-2 text-left text-[9px] font-bold uppercase w-[15%]">Marque</th>
                  <th className="py-2 text-left text-[9px] font-bold uppercase w-[15%]">Modèle</th>
                  <th className="py-2 text-center text-[9px] font-bold uppercase w-[8%]">Qté</th>
                  <th className="py-2 text-right text-[9px] font-bold uppercase w-[12%]">P.U. TTC</th>
                  <th className="py-2 pr-2 text-right text-[9px] font-bold uppercase w-[10%] rounded-tr-sm">Total</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {pageItems.map((item, i) => (
                  <React.Fragment key={item.id ?? i}>
                    <tr className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pl-2 pr-2">
                        <p className="font-semibold text-slate-900 leading-tight">{item.description}</p>
                        {item.reference && <p className="text-[8px] text-slate-500 font-mono">Réf: {item.reference}</p>}
                      </td>
                      <td className="py-2 text-slate-700">{item.marque || '-'}</td>
                      <td className="py-2 text-slate-700">{item.modele || '-'}</td>
                      <td className="py-2 text-center font-medium" style={{ color: secondary }}>{item.quantite}</td>
                      <td className="py-2 text-right font-medium" style={{ color: secondary }}>{item.prixUnitaire.toFixed(2)}</td>
                      <td className="py-2 pr-2 text-right font-bold text-slate-900">{item.total.toFixed(2)}</td>
                    </tr>
                    {/* Optional Lens Details */}
                    {item.lensDetails && item.lensDetails.length > 0 && (
                      <tr>
                        <td colSpan={6} className="pb-2 pl-4 pr-2 pt-0">
                          <div className="space-y-0.5">
                            {item.lensDetails.map((d: any, li: number) => (
                              <div key={li} className="flex gap-x-3 text-[8.5px] font-mono text-slate-600">
                                <span className="font-bold text-blue-600 w-4">{d.eye}</span>
                                <span>Sph: {formatOpticalValue(d.sphere)}</span>
                                <span>Cyl: {formatOpticalValue(d.cylinder)}</span>
                                <span>Axe: {d.axis ? `${d.axis}°` : '—'}</span>
                                {d.addition && <span>Add: {d.addition}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS & FOOTER (Last Page Only) */}
          {isLastPage && (
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between items-start gap-10">
                {/* TVA Breakdown */}
                <div className="flex-1">
                  <table className="w-full text-[9px] border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600">
                        <th className="border p-1 text-left">Taux TVA</th>
                        <th className="border p-1 text-right">Base HT</th>
                        <th className="border p-1 text-right">Montant TVA</th>
                        <th className="border p-1 text-right">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tvaBreakdown.map(([rate, vals]) => (
                        <tr key={rate}>
                          <td className="border p-1">{rate}%</td>
                          <td className="border p-1 text-right">{vals.base.toFixed(2)}</td>
                          <td className="border p-1 text-right">{vals.tax.toFixed(2)}</td>
                          <td className="border p-1 text-right">{vals.ttc.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="w-56 space-y-1.5">
                  <div className="flex justify-between text-[10px] px-2 text-slate-600">
                    <span>Total HT</span>
                    <span>{data.totals.sousTotal.toFixed(2)} DH</span>
                  </div>
                  {data.totals.tva != null && (
                    <div className="flex justify-between text-[10px] px-2 text-slate-600">
                      <span>Total TVA</span>
                      <span>{data.totals.tva.toFixed(2)} DH</span>
                    </div>
                  )}
                  <div className="p-2 rounded text-white flex justify-between items-center" style={{ backgroundColor: primary }}>
                    <span className="text-[9px] font-bold uppercase opacity-80">Total TTC</span>
                    <span className="text-base font-bold">{formatMAD(data.totals.totalTTC)}</span>
                  </div>
                  {data.totals.acompte != null && data.totals.acompte > 0 && (
                    <div className="flex justify-between text-[10px] text-green-600 font-bold px-2 pt-1">
                      <span>Acompte versé</span>
                      <span>- {formatMAD(data.totals.acompte)}</span>
                    </div>
                  )}
                  {data.totals.resteAPayer != null && (
                    <div className="flex justify-between text-[10px] text-red-600 font-bold px-2 pt-1 border-t border-red-50 mt-1">
                      <span>Reste à payer</span>
                      <span>{formatMAD(data.totals.resteAPayer)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount in words */}
              <div className="mt-4 p-2 bg-slate-50 border border-slate-200 rounded text-center">
                <p className="text-[9px] text-slate-600 mb-0.5">Arrêtée la présente facture à la somme de :</p>
                <p className="text-[10px] font-bold uppercase tracking-wide">
                  {data.totals.totalTTC.toFixed(2)} DH ({formatCurrencyToWords(data.totals.totalTTC)})
                </p>
              </div>

              {/* Footer / Signature Area */}
              <div className="mt-6 grid grid-cols-2 gap-8 items-end">
                <div className="text-[9px] text-slate-500 space-y-1">
                   <p className="font-bold text-slate-700 uppercase mb-1">Conditions & Paiement</p>
                   <p>{data.shop.paymentTerms || 'Paiement comptant à réception.'}</p>
                   <p>Modes: {data.shop.paymentMethods?.join(' • ') || 'Espèces • Carte • Chèque'}</p>
                </div>
                <div className="flex justify-end">
                  <div className="border border-dashed border-slate-300 rounded p-3 h-20 w-48">
                    <p className="text-[9px] font-bold uppercase text-slate-500 text-center border-b pb-1 mb-1">Cachet & Signature</p>
                  </div>
                </div>
              </div>

              {/* Legal Mentions */}
              <div className="mt-8 pt-2 border-t text-center text-[8px] text-slate-400 space-y-0.5">
                <p>{data.shop.nom} — {data.shop.adresse} — Tél: {data.shop.telephone}</p>
                {data.shop.mentionsLegales && <p>{data.shop.mentionsLegales}</p>}
                <p className="italic pt-1 font-medium text-slate-500">Merci de votre confiance</p>
              </div>
            </div>
          )}

          {/* Page numbering at bottom for all pages */}
          {totalPages > 1 && (
            <div className="absolute bottom-6 right-8 print:bottom-6">
              <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
            </div>
          )}
        </div>
      )}
    />
  );
}
