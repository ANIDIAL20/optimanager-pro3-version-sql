'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatMAD } from '@/lib/format-currency';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';
import { DocumentPages, PageBadge, DOC_PAGINATION_CONFIG } from '@/hooks/use-document-pagination';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';

interface RecuPDFProps {
  data: StandardDocumentData;
  config: DocumentTemplateConfig;
}

export function RecuPDF({ data, config }: RecuPDFProps) {
  const primary = config.primaryColor;
  const secondary = config.secondaryColor;
  
  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return iso;
    }
  };

  return (
    <DocumentPages
      items={data.items}
      config={DOC_PAGINATION_CONFIG.recu}
      renderPage={(pageItems, { pageNumber, totalPages, isFirstPage, isLastPage }) => (
        <div className="flex flex-col h-full p-8 md:p-10 print:p-8">
          {/* HEADER (Minimal but with full info on Page 1) */}
          {isFirstPage ? (
            <div className="mb-6 flex justify-between items-start border-b-2 pb-4" style={{ borderColor: primary }}>
              <div className="flex gap-4 items-center">
                {config.showLogo && data.shop.logoUrl && (
                  <div className="relative h-16 w-24">
                    <Image src={data.shop.logoUrl} alt="Logo" fill className="object-contain" unoptimized />
                  </div>
                )}
                <div>
                  <h1 className="text-base font-bold uppercase" style={{ color: primary }}>{data.shop.nom}</h1>
                  <p className="text-[9px] text-slate-500">{data.shop.adresse}</p>
                  <p className="text-[9px] text-slate-500">Tél: {data.shop.telephone}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-black italic tracking-wider mb-1" style={{ color: primary }}>REÇU</h2>
                <p className="text-[10px] font-bold text-slate-700">N° {data.documentNumber}</p>
                <p className="text-[9px] text-slate-500">{formatDate(data.date)}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex justify-between items-center border-b pb-2" style={{ borderColor: primary }}>
              <h2 className="text-sm font-bold uppercase" style={{ color: primary }}>{data.shop.nom} (Récu N° {data.documentNumber})</h2>
              <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
            </div>
          )}

          {/* RECIPIENT / PAYMENT INFO (Page 1 Only) */}
          {isFirstPage && (
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg bg-slate-50/50">
                <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Reçu de :</span>
                <p className="text-sm font-bold">{data.client?.nom || 'Client'}</p>
                {data.client?.telephone && <p className="text-[10px] text-slate-600">{data.client.telephone}</p>}
              </div>
              <div className="p-3 border rounded-lg bg-blue-50/30">
                <span className="text-[8px] font-bold text-blue-400 uppercase block mb-1">Mode de règlement :</span>
                <p className="text-sm font-bold text-blue-800">{data.modePaiement ?? 'Espèces'}</p>
              </div>
            </div>
          )}

          {/* ITEMS TABLE (Shortened list) */}
          <div className="flex-grow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-white text-left" style={{ backgroundColor: primary }}>
                  <th className="py-2 pl-3 text-[9px] font-bold uppercase w-[60%]">Désignation</th>
                  <th className="py-2 text-center text-[9px] font-bold uppercase w-[10%]">Qté</th>
                  <th className="py-2 pr-3 text-right text-[9px] font-bold uppercase w-[30%]">Montant</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {pageItems.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pl-3">
                        <span className="font-semibold text-slate-800">{item.description}</span>
                    </td>
                    <td className="py-2 text-center">{item.quantite}</td>
                    <td className="py-2 pr-3 text-right font-medium">{item.total.toFixed(2)} DH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* LEGAL RECEIPT BOX & TOTALS (Last Page Only) */}
          {isLastPage && (
            <div className="mt-6 flex flex-col gap-6">
              
              {/* Receipt legal box */}
              <div className="p-4 rounded-xl border-2 bg-slate-50/50 shadow-inner" style={{ borderColor: primary }}>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Reçu la somme de :</span>
                  <span className="text-2xl font-black text-slate-900">{formatMAD(data.totals.acompte || data.totals.totalTTC)}</span>
                </div>
                {data.montantEnLettres && (
                  <p className="text-xs italic text-slate-700 bg-white p-2 rounded border border-slate-100 uppercase font-medium">
                    &quot;{data.montantEnLettres}&quot;
                  </p>
                )}
              </div>

              {/* Summary Totals */}
              <div className="flex justify-end pr-2">
                <div className="w-56 space-y-1.5 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Total Document</span>
                    <span>{data.totals.totalTTC.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-green-600">
                    <span>Acompte Versé</span>
                    <span>- {formatMAD(data.totals.acompte || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t-2 border-red-100 font-extrabold text-red-600">
                    <span>Reste à Payer</span>
                    <span>{formatMAD(data.totals.resteAPayer || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Signature Area & Legal mention */}
              <div className="grid grid-cols-2 gap-8 items-end mt-4">
                <div className="text-[9px] text-slate-400 italic">
                  Paiement reçu le {formatDate(data.date)}. <br />
                  Document généré par OptiManager Pro.
                </div>
                <div className="flex flex-col items-center">
                  <div className="border border-dashed border-slate-300 rounded p-2 h-20 w-44 flex flex-col items-center justify-center">
                    <p className="text-[8px] font-bold uppercase text-slate-300">Cachet & Signature</p>
                    <p className="text-[7px] text-slate-200 mt-auto">{data.shop.nom}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page numbering */}
          {totalPages > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
            </div>
          )}
        </div>
      )}
    />
  );
}
