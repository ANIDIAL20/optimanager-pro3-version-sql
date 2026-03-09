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

interface DevisPDFProps {
  data: StandardDocumentData;
  config: DocumentTemplateConfig;
}

export function DevisPDF({ data, config }: DevisPDFProps) {
  const primary = config.primaryColor;
  const secondary = config.secondaryColor;
  
  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return iso;
    }
  };

  return (
    <DocumentPages
      items={data.items}
      config={DOC_PAGINATION_CONFIG.devis}
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
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block px-5 py-2 rounded mb-2 text-white" style={{ backgroundColor: primary }}>
                  <span className="text-base font-bold tracking-[0.2em] uppercase">DEVIS</span>
                </div>
                <div className="text-[10px] space-y-0.5">
                  <p className="font-semibold" style={{ color: primary }}>N° {data.documentNumber}</p>
                  <p style={{ color: secondary }}>Date : {formatDate(data.date)}</p>
                  <p className="text-[9px] font-medium text-slate-500">Validité : {data.validityDays ?? 15} jours</p>
                </div>
              </div>
            </div>
          ) : (
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
                <p className="text-[10px] font-bold" style={{ color: primary }}>Devis N° {data.documentNumber}</p>
                <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
              </div>
            </div>
          )}

          {/* RECIPIENT BLOCK (Page 1 Only) */}
          {isFirstPage && data.client && (
            <div className="mb-6 flex justify-end">
              <div className="w-[50%] p-4 rounded-lg border border-amber-200 bg-amber-50/30">
                <h3 className="text-[9px] font-bold uppercase text-amber-700 mb-1 tracking-wider">Établi pour :</h3>
                <div className="text-xs text-slate-900">
                  <p className="font-bold mb-0.5 text-sm">{data.client.nom}</p>
                  {data.client.telephone && <p className="text-[10px]">{data.client.telephone}</p>}
                  {data.client.adresse && <p className="text-[10px]">{data.client.adresse}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ITEMS TABLE */}
          <div className="flex-grow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: primary }}>
                  <th className="py-2.5 pl-3 text-left text-[9px] font-bold uppercase w-[40%] rounded-tl-sm">Désignation</th>
                  <th className="py-2.5 text-left text-[9px] font-bold uppercase w-[15%]">Marque</th>
                  <th className="py-2.5 text-left text-[9px] font-bold uppercase w-[15%]">Modèle</th>
                  <th className="py-2.5 text-center text-[9px] font-bold uppercase w-[8%]">Qté</th>
                  <th className="py-2.5 text-right text-[9px] font-bold uppercase w-[12%]">P.U. TTC</th>
                  <th className="py-2.5 pr-3 text-right text-[9px] font-bold uppercase w-[10%] rounded-tr-sm">Total</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {pageItems.map((item, i) => (
                  <React.Fragment key={item.id ?? i}>
                    <tr className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pl-3 pr-2">
                        <p className="font-semibold text-slate-900 leading-tight">{item.description}</p>
                        {item.reference && <p className="text-[8px] text-slate-500 font-mono">Réf: {item.reference}</p>}
                      </td>
                      <td className="py-2.5 text-slate-700">{item.marque || '-'}</td>
                      <td className="py-2.5 text-slate-700">{item.modele || '-'}</td>
                      <td className="py-2.5 text-center font-medium" style={{ color: secondary }}>{item.quantite}</td>
                      <td className="py-2.5 text-right font-medium" style={{ color: secondary }}>{item.prixUnitaire.toFixed(2)}</td>
                      <td className="py-2.5 pr-3 text-right font-bold text-slate-900">{item.total.toFixed(2)}</td>
                    </tr>
                    {item.lensDetails && item.lensDetails.length > 0 && (
                      <tr>
                        <td colSpan={6} className="pb-2.5 pl-5 pr-3 pt-0">
                           <div className="space-y-0.5 border-l border-slate-200 pl-3">
                            {item.lensDetails.map((d: any, li: number) => (
                              <div key={li} className="flex gap-x-3 text-[8.5px] text-slate-600 font-mono">
                                <span className="font-bold text-amber-600 w-4">{d.eye}</span>
                                <span>Sph: {formatOpticalValue(d.sphere)}</span>
                                <span>Cyl: {formatOpticalValue(d.cylinder)}</span>
                                <span>Axe: {d.axis ? `${d.axis}°` : '—'}</span>
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
            <div className="mt-8">
              <div className="flex justify-end pr-2">
                <div className="w-56 space-y-2">
                  <div className="flex justify-between text-[11px] px-2 text-slate-700 font-medium">
                    <span>Total HT</span>
                    <span>{data.totals.sousTotal.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-[11px] px-2 text-slate-700 font-medium pb-2 border-b">
                    <span>Total TVA (20%)</span>
                    <span>{(data.totals.tva || 0).toFixed(2)} DH</span>
                  </div>
                  <div className="p-2.5 rounded text-white flex justify-between items-center shadow-sm" style={{ backgroundColor: primary }}>
                    <span className="text-[10px] font-bold uppercase">Net à Payer</span>
                    <span className="text-xl font-black">{formatMAD(data.totals.totalTTC)}</span>
                  </div>
                </div>
              </div>

              {/* Amount in words */}
              <div className="mt-6 p-3 bg-white border-2 border-slate-100 rounded-lg text-center">
                <p className="text-[9px] text-slate-500 mb-1">Arrêté le présent devis à la somme de :</p>
                <p className="text-[11px] font-black uppercase text-slate-900">
                  {data.totals.totalTTC.toFixed(2)} DH ({formatCurrencyToWords(data.totals.totalTTC)})
                </p>
              </div>

              {/* Signature Area */}
              <div className="mt-10 grid grid-cols-2 gap-10">
                <div className="text-[9px] text-slate-500 bg-slate-50 p-3 rounded border border-slate-100 italic">
                  Ce devis est valable pour une durée de {data.validityDays ?? 15} jours à compter de la date d&apos;émission. 
                  Il ne constitue pas une commande définitive.
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Cachet et Signature</p>
                  <div className="border border-slate-200 rounded w-full h-24 bg-white shadow-inner" />
                  <p className="text-[8px] text-slate-300 mt-1 italic">Bon pour accord</p>
                </div>
              </div>

              {/* Minimal Legal Footer */}
              <div className="mt-10 pt-4 border-t text-center text-[8px] text-slate-400">
                <p>{data.shop.nom} — {data.shop.adresse} — {data.shop.telephone}</p>
                <p className="mt-1 italic text-slate-300">Généré par OptiManager Pro</p>
              </div>
            </div>
          )}

          {/* Page numbering */}
          {totalPages > 1 && (
            <div className="absolute bottom-8 right-8">
              <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
            </div>
          )}
        </div>
      )}
    />
  );
}
