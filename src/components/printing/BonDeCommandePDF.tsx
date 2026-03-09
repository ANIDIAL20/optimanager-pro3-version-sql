'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatMAD } from '@/lib/format-currency';
import { DocumentPages, PageBadge, DOC_PAGINATION_CONFIG } from '@/hooks/use-document-pagination';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';

interface BonDeCommandePDFProps {
  data: StandardDocumentData;
  config: DocumentTemplateConfig;
}

export function BonDeCommandePDF({ data, config }: BonDeCommandePDFProps) {
  const primary = config.primaryColor;
  
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
      config={DOC_PAGINATION_CONFIG.bon_de_commande}
      renderPage={(pageItems, { pageNumber, totalPages, isFirstPage, isLastPage }) => (
        <div className="flex flex-col h-full p-8 md:p-10 print:p-8">
          {/* HEADER */}
          {isFirstPage ? (
            <div className="mb-6 flex justify-between items-start border-b-2 pb-5" style={{ borderColor: primary }}>
              <div className="flex gap-4 items-start">
                <div className="space-y-1">
                  <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: primary }}>{data.shop.nom}</h1>
                  <div className="text-[10px] text-slate-600 leading-snug">
                    <p>{data.shop.adresse}</p>
                    <p>Tél: {data.shop.telephone}</p>
                    <p>ICE: {data.shop.ice}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-900 text-white px-4 py-2 rounded mb-2">
                  <span className="text-sm font-bold tracking-widest uppercase">BON DE COMMANDE</span>
                </div>
                <p className="text-xs font-bold">N° {data.documentNumber}</p>
                <p className="text-[10px] text-slate-500">Date : {formatDate(data.date)}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex justify-between items-center border-b pb-3" style={{ borderColor: primary }}>
              <h2 className="text-sm font-bold uppercase" style={{ color: primary }}>{data.shop.nom} — BC N° {data.documentNumber}</h2>
              <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
            </div>
          )}

          {/* FOURNISSEUR INFO (Page 1 Only) */}
          {isFirstPage && data.fournisseur && (
            <div className="mb-6 grid grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/20">
                <h3 className="text-[9px] font-bold uppercase text-amber-700 mb-2">Adréssé au Fournisseur :</h3>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-base">{data.fournisseur.nom}</p>
                  <p className="text-slate-600">{data.fournisseur.adresse}</p>
                  <p className="text-slate-600">Tél: {data.fournisseur.telephone}</p>
                  <p className="text-slate-600">Email: {data.fournisseur.email}</p>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <h3 className="text-[9px] font-bold uppercase text-slate-500 mb-2">Détails Livraison :</h3>
                <div className="text-xs space-y-1">
                  <p><span className="font-semibold">Lieu:</span> {data.commandeDetails?.lieuLivraison || 'Magasin'}</p>
                  <p><span className="font-semibold">Souhaitée:</span> {data.commandeDetails?.dateLivraisonSouhaitee ? formatDate(data.commandeDetails.dateLivraisonSouhaitee) : 'ASAP'}</p>
                  <p><span className="font-semibold">Conditions:</span> {data.fournisseur.conditionsPaiement || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* ITEMS TABLE (HT Prices for B2B) */}
          <div className="flex-grow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-2.5 pl-3 text-left text-[9px] font-bold uppercase w-[50%]">Référence / Désignation</th>
                  <th className="py-2.5 text-center text-[9px] font-bold uppercase w-[10%]">Qté</th>
                  <th className="py-2.5 text-right text-[9px] font-bold uppercase w-[20%]">P.U. HT</th>
                  <th className="py-2.5 pr-3 text-right text-[9px] font-bold uppercase w-[20%]">Montant HT</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {pageItems.map((item, i) => {
                  const rate = item.tvaRate ?? 20;
                  const unitHT = item.prixUnitaire / (1 + rate / 100);
                  const totalHT = item.total / (1 + rate / 100);
                  
                  return (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="py-3 pl-3">
                        <p className="font-bold text-slate-900">{item.description}</p>
                        {item.reference && <p className="text-[9px] text-slate-500 font-mono mt-0.5">Réf: {item.reference}</p>}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">{item.quantite}</td>
                      <td className="py-3 text-right text-slate-600">{unitHT.toFixed(2)}</td>
                      <td className="py-3 pr-3 text-right font-bold text-slate-900">{totalHT.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTALS & FOOTER (Last Page Only) */}
          {isLastPage && (
            <div className="mt-8">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-xs px-2">
                    <span className="text-slate-500 uppercase font-bold text-[9px]">Total HT Estimé</span>
                    <span className="text-lg font-black">{formatMAD(data.totals.sousTotal)}</span>
                  </div>
                  <div className="bg-amber-100 p-2 rounded text-[9px] text-amber-800 italic">
                    * Les montants sont indiqués hors taxes (HT) conformément aux usages commerciaux.
                  </div>
                </div>
              </div>

              {/* Observations */}
              {data.commandeDetails?.observations && (
                <div className="mt-6 p-4 border rounded bg-slate-50">
                  <h4 className="text-[9px] font-bold uppercase text-slate-500 mb-1">Observations particulières :</h4>
                  <p className="text-xs text-slate-700">{data.commandeDetails.observations}</p>
                </div>
              )}

              {/* Signature dual area */}
              <div className="mt-10 grid grid-cols-2 gap-10">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase text-slate-400 mb-10">Cachet & Signature Fournisseur</p>
                  <div className="border-b border-slate-300 w-full" />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase text-slate-400 mb-10">Cachet & Signature Client</p>
                  <div className="border-b border-slate-300 w-full" />
                </div>
              </div>

              {/* Legal Footer */}
              <div className="mt-12 pt-4 border-t text-[8px] text-slate-400 text-center">
                 <p>Ce bon de commande est ferme et définitif. Les marchandises doivent être conformes aux spécifications indiquées.</p>
                 <p className="mt-1">OptiManager Pro — Solution de gestion optique</p>
              </div>
            </div>
          )}

          {/* Page numbering */}
          {totalPages > 1 && (
            <div className="absolute bottom-10 right-10">
              <PageBadge pageNumber={pageNumber} totalPages={totalPages} />
            </div>
          )}
        </div>
      )}
    />
  );
}
