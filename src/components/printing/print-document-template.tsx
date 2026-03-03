'use client';

import * as React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Printer, ArrowLeft } from 'lucide-react';
import { formatMAD } from '@/lib/format-currency';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';

interface PrintDocumentTemplateProps {
  data: StandardDocumentData;
  /** Optional template config — falls back to DEFAULT_TEMPLATE_CONFIG */
  config?: DocumentTemplateConfig;
  /** Show the toolbar (Back + Print buttons). Default: true */
  showToolbar?: boolean;
  onBack?: () => void;
  /** Custom content slot that bypasses the classic items table and totals */
  customContent?: React.ReactNode;
}

export function PrintDocumentTemplate({
  data,
  config: configProp,
  showToolbar = true,
  onBack,
  customContent,
}: PrintDocumentTemplateProps) {
  const config = { ...DEFAULT_TEMPLATE_CONFIG, ...configProp };

  // ── Derived style helpers ──────────────────────────────────────────────────
  const primary = config.primaryColor;
  const secondary = config.secondaryColor;
  const fontSizeMap = { small: 'text-xs', medium: 'text-sm', large: 'text-base' } as const;
  const bodyFontSize = fontSizeMap[config.fontSize];
  const isModern  = config.templateId === 'modern';
  const isMinimal = config.templateId === 'minimal';
  const isBold    = config.templateId === 'bold';
  const isElegant = config.templateId === 'elegant';
  const isDevis   = data.type === 'DEVIS';
  const isRecu    = data.type === 'REÇU';
  const isBonCmd  = data.type === 'BON DE COMMANDE';

  // ── Date formatting ────────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return iso;
    }
  };

  // ── TVA breakdown (grouped by rate) ────────────────────────────────────────
  const tvaBreakdown = React.useMemo(() => {
    const map: Record<number, { base: number; tax: number; ttc: number }> = {};
    for (const item of data.items) {
      const rate = item.tvaRate ?? 20;
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

  // ── Payment methods ─────────────────────────────────────────────────────────
  const paymentMethods = data.shop.paymentMethods?.length
    ? data.shop.paymentMethods
    : ['Espèces', 'Chèque', 'Virement bancaire'];

  return (
    <>
      {/* ── Toolbar (screen only) ─────────────────────────────────────────── */}
      {showToolbar && (
        <div className="w-full max-w-[210mm] mx-auto mb-6 flex justify-between px-4 print:hidden">
          <button
            onClick={onBack ?? (() => window.history.back())}
            className="flex items-center gap-2 border border-gray-300 text-gray-700
                       px-4 py-2 rounded-md hover:bg-gray-50 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white
                       px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimer le document
          </button>
        </div>
      )}

      {/* ── A4 Sheet ──────────────────────────────────────────────────────── */}
      <div
        className={`w-[210mm] mx-auto bg-white shadow-lg
                   print:shadow-none print:m-0 print:w-full
                   text-black ${bodyFontSize}
                   ${ isElegant ? 'font-serif bg-amber-50/20' : '' }
                   ${ isMinimal ? 'p-12' : 'p-8 md:p-10 print:p-8' }
                   ${ isRecu ? 'print:max-h-[297mm] print:overflow-hidden' : '' }
                   `}
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div
          className={`mb-6 ${
            isModern
              ? 'rounded-t-sm -mx-0 -mt-0 px-8 pt-6 pb-5 text-white'
              : isMinimal
              ? 'flex justify-between items-center pb-4'
              : isBold
              ? 'pb-3'
              : 'flex justify-between items-start border-b-2 pb-5'
          }`}
          style={{
            ...(isModern ? { backgroundColor: primary } : {}),
            ...(!isModern && !isMinimal ? { borderColor: primary } : {}),
          }}
        >
          {/* Shop / Logo  —  controlled by headerLayout */}
          <div
            className={`flex ${
              config.headerLayout === 'logo-center' ? 'flex-col items-center gap-y-2 w-full' :
              config.headerLayout === 'logo-right'  ? 'flex-row-reverse justify-between w-full' :
              'flex-row justify-between w-full'
            } gap-4 items-start`}
          >
            {/* LEFT side: logo + shop info */}
            <div className="flex gap-4 items-start">
              {config.showLogo && data.shop.logoUrl && (
                <div className="relative h-24 w-36 flex-shrink-0">
                  <Image
                    src={data.shop.logoUrl}
                    alt="Logo"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div className="space-y-0.5">
                <h1
                  className={`${isBold ? 'text-2xl font-black' : 'text-lg font-bold'} uppercase tracking-wide leading-none`}
                  style={{ color: isModern ? 'white' : primary }}
                >
                  {data.shop.nom}
                </h1>
                <div className="leading-snug space-y-0.5" style={{ color: isModern ? 'rgba(255,255,255,0.75)' : secondary }}>
                  {config.showAddress && data.shop.adresse && <p>{data.shop.adresse}</p>}
                  {config.showPhone && data.shop.telephone && <p>Tél: {data.shop.telephone}</p>}
                  {config.showICE && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px]" style={{ color: isModern ? 'rgba(255,255,255,0.55)' : secondary }}>
                      {data.shop.ice  && <span>ICE: {data.shop.ice}</span>}
                      {data.shop.if_  && <span>IF: {data.shop.if_}</span>}
                      {data.shop.rc   && <span>RC: {data.shop.rc}</span>}
                      {data.shop.tp   && <span>TP: {data.shop.tp}</span>}
                      {data.shop.inpe && <span>INPE: {data.shop.inpe}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT side: document meta */}
            <div className="text-right shrink-0">
              <div
                className="inline-block px-4 py-1.5 rounded mb-2 text-white"
                style={{ backgroundColor: isModern ? 'rgba(255,255,255,0.2)' : primary }}
              >
                <span
                  className={`${isBold ? 'text-xl font-black' : 'text-base font-bold'} tracking-widest`}
                  style={{ color: isModern ? 'white' : undefined }}
                >
                  {data.type}
                </span>
              </div>
              <div className="text-[10px] space-y-0.5">
                <p className="font-semibold" style={{ color: isModern ? 'white' : primary }}>N° {data.documentNumber}</p>
                <p style={{ color: isModern ? 'rgba(255,255,255,0.65)' : secondary }}>Date : {formatDate(data.date)}</p>
                {isDevis && (
                  <p style={{ color: isModern ? 'rgba(255,255,255,0.55)' : secondary }}>Validité : {data.validityDays ?? 15} jours</p>
                )}
                {data.status && (
                  <p className="uppercase font-bold text-[9px] px-1.5 py-0.5 rounded inline-block mt-1 border"
                     style={{ backgroundColor: primary + '15', color: primary, borderColor: primary + '40' }}>
                    {data.status}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RECIPIENT BLOCK ─────────────────────────────────────────────── */}

        {/* FACTURE / DEVIS / REÇU → show client */}
        {data.client && !isBonCmd && (
          <div className="mb-6 flex justify-end">
            <div className="w-[55%] p-4 rounded-lg border border-slate-200 bg-slate-50/80 print:bg-slate-50 print:border-slate-300">
              <h3 className="text-[9px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">
                {isDevis ? 'Devis établi pour :' : isRecu ? 'Reçu de :' : 'Facturé à :'}
              </h3>
              <div className="text-xs text-slate-900">
                <p className="font-bold text-sm mb-1">{data.client.nom}</p>
                {data.client.telephone && (
                  <p className="text-slate-600 text-[10px]">{data.client.telephone}</p>
                )}
                {data.client.adresse && (
                  <p className="text-slate-600 text-[10px]">{data.client.adresse}</p>
                )}
                {data.client.mutuelle && (
                  <div className="mt-1.5 text-[10px] text-blue-700 font-medium pt-1 border-t border-slate-200">
                    Mutuelle : {data.client.mutuelle}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BON DE COMMANDE → show fournisseur */}
        {data.fournisseur && isBonCmd && (
          <div className="mb-6 flex justify-between items-start gap-6">
            <div className="flex-1 p-4 rounded-lg border border-amber-200 bg-amber-50/60 print:bg-transparent print:border">
              <h3 className="text-[9px] font-bold uppercase text-amber-700 mb-1.5 tracking-wider">
                Adressé au Fournisseur :
              </h3>
              <div className="text-xs text-slate-900">
                <p className="font-bold text-sm mb-1">{data.fournisseur.nom}</p>
                {data.fournisseur.adresse && (
                  <p className="text-slate-600 text-[10px]">{data.fournisseur.adresse}</p>
                )}
                {data.fournisseur.telephone && (
                  <p className="text-slate-600 text-[10px]">Tél : {data.fournisseur.telephone}</p>
                )}
                {data.fournisseur.email && (
                  <p className="text-slate-600 text-[10px]">Email : {data.fournisseur.email}</p>
                )}
                {data.fournisseur.contact && (
                  <p className="text-slate-600 text-[10px]">Contact : {data.fournisseur.contact}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BON DE COMMANDE → commande details grid */}
        {isBonCmd && data.commandeDetails && (
          <div className="mb-6 grid grid-cols-2 gap-4 text-[10px] border border-slate-200 rounded p-3 bg-slate-50/60 print:bg-transparent">
            {data.commandeDetails.lieuLivraison && (
              <div>
                <span className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Lieu de livraison :</span>
                <p className="text-slate-800 mt-0.5">{data.commandeDetails.lieuLivraison}</p>
              </div>
            )}
            {data.commandeDetails.dateLivraisonSouhaitee && (
              <div>
                <span className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Livraison souhaitée :</span>
                <p className="text-slate-800 mt-0.5">
                  {(() => { try { return format(new Date(data.commandeDetails!.dateLivraisonSouhaitee!), 'dd MMMM yyyy', { locale: fr }); } catch { return data.commandeDetails!.dateLivraisonSouhaitee!; } })()}
                </p>
              </div>
            )}
            {data.fournisseur?.conditionsPaiement && (
              <div>
                <span className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Conditions de paiement :</span>
                <p className="text-slate-800 mt-0.5">{data.fournisseur.conditionsPaiement}</p>
              </div>
            )}
            {data.fournisseur?.delaiLivraison && (
              <div>
                <span className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Délai de livraison :</span>
                <p className="text-slate-800 mt-0.5">{data.fournisseur.delaiLivraison}</p>
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOM CONTENT SLOT (Bypasses all standard blocks) ──────────── */}
        {customContent ? (
          <div className="mt-6 break-inside-avoid">
            {customContent}
          </div>
        ) : (
          <>
            {/* ── REÇU: payment method + ordonnance row (client already shown above) ── */}
            {isRecu && (
              <div className="mb-4 flex justify-between items-start border-b border-slate-200 pb-3">
                {/* Mode de paiement */}
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Mode de paiement</p>
                  <p className="text-sm font-bold text-slate-900">
                    {data.modePaiement ?? 'Espèces'}
                  </p>
                </div>
                {/* Ordonnance (only if present) */}
                {data.ordonnance && (
                  <div className="text-right space-y-1 border-l border-slate-200 pl-6">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Ordonnance</p>
                    <p className="text-[10px] text-slate-800"><span className="text-slate-500">Dr :</span> {data.ordonnance.prescripteur}</p>
                    <p className="text-[10px] text-slate-800"><span className="text-slate-500">Du :</span> {(() => { try { return format(new Date(data.ordonnance.dateOrdonnance), 'dd/MM/yyyy', { locale: fr }); } catch { return data.ordonnance.dateOrdonnance; } })()}</p>
                  </div>
                )}
              </div>
            )}

        {/* ── TABLE HEADER ────────────────────────────────────────────────── */}
        {(true) && (
          <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-white print:text-white" style={{ backgroundColor: primary }}>
                <th className="py-2 pl-2 text-left text-[9px] font-bold uppercase tracking-wider w-[38%] rounded-tl-sm">
                  {isBonCmd ? 'Référence / Désignation' : 'Désignation'}
                </th>
                {!isBonCmd && (
                  <th className="py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[14%]">
                    Marque
                  </th>
                )}
                {!isBonCmd && (
                  <th className="py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[14%]">
                    Modèle
                  </th>
                )}
                <th className="py-2 text-center text-[9px] font-bold uppercase tracking-wider w-[8%]">
                  {isBonCmd ? 'Qté cmdée' : 'Qté'}
                </th>
                <th className="py-2 text-right text-[9px] font-bold uppercase tracking-wider w-[12%]">
                  {isBonCmd ? 'Prix unit. HT' : 'P.U. HT'}
                </th>
                <th className="py-2 pr-2 text-right text-[9px] font-bold uppercase tracking-wider w-[13%] rounded-tr-sm">
                  {isBonCmd ? 'Montant HT' : 'Total HT'}
                </th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {data.items.map((item, i) => {
                // HT from TTC
                const rate = item.tvaRate ?? 20;
                const unitHT = item.prixUnitaire / (1 + rate / 100);
                const totalHT = item.total / (1 + rate / 100);

                return (
                  <React.Fragment key={item.id ?? i}>
                  <tr
                    className="border-b border-slate-100 last:border-0 break-inside-avoid"
                  >
                    <td className={`${isRecu ? 'py-1' : 'py-2'} pl-2 pr-2`}>
                      <p className="font-semibold text-slate-900 leading-tight">
                        {item.description}
                      </p>
                      {item.reference && (
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          Réf: {item.reference}
                        </p>
                      )}
                      {item.couleur && (
                        <p className="text-[9px] text-slate-600 mt-0.5">
                          Couleur: {item.couleur}
                        </p>
                      )}

                      {/* Contact lens tags */}
                      {item.contactLensDetails && item.contactLensDetails.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.contactLensDetails.map((d, ci) => (
                            <div
                              key={ci}
                              className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5
                                         rounded border border-indigo-100 font-mono flex items-center gap-1"
                            >
                              <span className="font-bold">{d.eye}:</span>
                              <span className="flex gap-1">
                                {d.power     && <span>P:{d.power}</span>}
                                {d.baseCurve && <span>BC:{d.baseCurve}</span>}
                                {d.diameter  && <span>D:{d.diameter}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`${isRecu ? 'py-1' : 'py-2'} text-slate-700`}>{item.marque  ?? '-'}</td>
                    <td className={`${isRecu ? 'py-1' : 'py-2'} text-slate-700`}>{item.modele  ?? '-'}</td>
                    <td className={`${isRecu ? 'py-1' : 'py-2'} text-center text-slate-600 font-medium`}>
                      {item.quantite}
                    </td>
                    <td className={`${isRecu ? 'py-1' : 'py-2'} text-right text-slate-600 font-medium`}>
                      {unitHT.toFixed(2)}
                    </td>
                    <td className={`${isRecu ? 'py-1' : 'py-2'} pr-2 text-right font-bold text-slate-900`}>
                      {totalHT.toFixed(2)}
                    </td>
                  </tr>
                  {item.lensDetails && (
                    <tr className="border-b border-slate-100 last:border-0 break-inside-avoid bg-slate-50/50">
                      <td colSpan={isBonCmd ? 4 : 6} className="pb-2.5 pl-2 pr-2 pt-1 border-t-0">
                        <div className="flex flex-wrap gap-2 text-print-black">
                          {item.lensDetails.map((d: any, li: number) => (
                            <div
                              key={li}
                              className="text-[9px] bg-white text-slate-700 px-2 py-1
                                         rounded shadow-sm border border-slate-200 font-mono flex items-center gap-1.5"
                            >
                              <span className="font-bold border-r border-slate-300 pr-1.5" style={{ color: primary }}>{d.eye}</span>
                              <span className="flex gap-2">
                                {d.sphere   && <span>S: {d.sphere}</span>}
                                {d.cylinder && <span>C: {d.cylinder}</span>}
                                {d.axis     && <span>A: {d.axis}°</span>}
                                {d.addition && <span>Add: {d.addition}</span>}
                                {d.treatment && (
                                  <span className="text-slate-500 italic pl-1 border-l border-slate-300">{d.treatment}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {/* ── TOTALS + TVA BREAKDOWN ───────────────────────────────────────── */}
        {(true) && (
          <div className="flex justify-between items-start mb-4 gap-6 break-inside-avoid">

          {/* TVA Breakdown table (left) — hidden for REÇU */}
          {!isRecu && (
          <div className="flex-1">
            <table className="w-full text-[9px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 p-1.5 text-left font-semibold">Taux TVA</th>
                  <th className="border border-slate-200 p-1.5 text-right font-semibold">Base HT</th>
                  <th className="border border-slate-200 p-1.5 text-right font-semibold">Montant TVA</th>
                  <th className="border border-slate-200 p-1.5 text-right font-semibold">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {tvaBreakdown.map(([rate, vals]) => (
                  <tr key={rate}>
                    <td className="border border-slate-200 py-1.5 px-1.5 text-slate-600">{rate}%</td>
                    <td className="border border-slate-200 py-1.5 px-1.5 text-right text-slate-600">
                      {vals.base.toFixed(2)} DH
                    </td>
                    <td className="border border-slate-200 py-1.5 px-1.5 text-right text-slate-600">
                      {vals.tax.toFixed(2)} DH
                    </td>
                    <td className="border border-slate-200 py-1.5 px-1.5 text-right text-slate-600">
                      {vals.ttc.toFixed(2)} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Summary totals (right) */}
          <div className="w-64">
            <div className="space-y-1.5 mb-2 px-3">
              <div className="flex justify-between text-[10px] text-slate-600">
                <span className="font-medium">Total HT</span>
                <span>{data.totals.sousTotal.toFixed(2)} DH</span>
              </div>
              {!isBonCmd && !isRecu && data.totals.tva != null && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span className="font-medium">Total TVA</span>
                  <span>{data.totals.tva.toFixed(2)} DH</span>
                </div>
              )}
            </div>

            {/* Total block — label changes per doc type */}
            <div className="p-2.5 rounded shadow-sm print:text-white" style={{ backgroundColor: primary }}>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-medium uppercase tracking-wider opacity-80 text-white">
                  {isBonCmd ? 'Total HT estimé' : 'Total TTC'}
                </span>
                <span className="text-lg font-bold text-white">
                  {formatMAD(data.totals.totalTTC)}
                </span>
              </div>
            </div>

            {/* Acompte — green, only if > 0 */}
            {data.totals.acompte != null && data.totals.acompte > 0 && (
              <div className="flex justify-between text-[10px] text-green-600 font-bold px-3 pt-2">
                <span>Acompte versé</span>
                <span>- {formatMAD(data.totals.acompte)}</span>
              </div>
            )}

            {/* Reste à payer — red, only if defined */}
            {data.totals.resteAPayer != null && (
              <div className="flex justify-between text-[10px] text-red-600 font-bold px-3 pt-2 border-t border-red-100 mt-1">
                <span>Reste à payer</span>
                <span>{formatMAD(data.totals.resteAPayer)}</span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ── AMOUNT IN WORDS — FACTURE / DEVIS ───────────────────────────── */}
        {!isRecu && !isBonCmd && (
          <div className="my-3 p-2 bg-slate-50 border border-slate-200 rounded print:bg-slate-50 print:border-slate-200 break-inside-avoid">
            <p className="text-[9px] text-slate-600 mb-1">
              {isDevis ? 'Arrêté le présent devis' : 'Arrêtée la présente facture'} à la somme de :
            </p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-900">
              {data.totals.totalTTC.toFixed(2)} DH ({formatCurrencyToWords(data.totals.totalTTC)})
            </p>
          </div>
        )}

        {/* ── REÇU: «Reçu la somme de» legal box (required in Morocco) ─────── */}
        {isRecu && (
          <div className="my-2 px-3 py-2 rounded border-2 break-inside-avoid print:border-slate-800"
               style={{ borderColor: primary, backgroundColor: primary + '08' }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: primary }}>
              Reçu la somme de
            </p>
            <p className="text-base font-black text-slate-900">
              {formatMAD(data.totals.acompte ?? data.totals.totalTTC)}
            </p>
            {data.montantEnLettres && (
              <p className="text-[10px] italic text-slate-700 mt-0.5 uppercase">
                {data.montantEnLettres}
              </p>
            )}
            <p className="text-[9px] text-slate-500 mt-1">
              Mode de règlement : <span className="font-semibold text-slate-800">{data.modePaiement ?? 'Espèces'}</span>
            </p>
          </div>
        )}

        {/* ── PAYMENT METHODS — FACTURE only ───────────────────────────────── */}
        {!isRecu && !isBonCmd && (
          <div className="mt-3 p-2 border border-slate-200 rounded bg-white break-inside-avoid">
            <p className="text-[9px] font-bold uppercase text-slate-700 mb-1.5">
              Modes de paiement acceptés
            </p>
            <p className="text-[10px] text-slate-600">{paymentMethods.join(' • ')}</p>
          </div>
        )}

        {/* ── SIGNATURE AREA ───────────────────────────────────────────────── */}
        {(isRecu || isBonCmd || config.showSignatureBox) && (
          <div className="break-inside-avoid mt-4">
          {isBonCmd ? (
            <div className="mt-6 space-y-4">
              {/* Observations */}
              {data.commandeDetails?.observations && (
                <div className="p-3 border border-slate-200 rounded text-[10px] bg-slate-50/60 print:bg-transparent">
                  <p className="font-bold text-slate-600 uppercase text-[9px] tracking-wide mb-1">Observations :</p>
                  <p className="text-slate-800">{data.commandeDetails.observations}</p>
                </div>
              )}
              {/* Legal mention */}
              <div className="text-[9px] text-slate-500 border-t border-slate-200 pt-3">
                <p>Ce bon de commande est ferme et définitif sous réserve de confirmation écrite du fournisseur.</p>
                {data.commandeDetails?.validiteOffre && <p>{data.commandeDetails.validiteOffre}</p>}
              </div>
              {/* Dual signatures */}
              <div className="flex justify-between mt-8">
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 mb-8">Signature &amp; Cachet Fournisseur</p>
                  <div className="w-40 border-b border-gray-400 mx-auto" />
                  <p className="text-[8px] text-slate-400 mt-1">Bon pour accord</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 mb-8">Signature &amp; Cachet Magasin</p>
                  <div className="w-40 border-b border-gray-400 mx-auto" />
                  <p className="text-[8px] text-slate-400 mt-1">Le responsable</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={isRecu ? 'mb-2 flex justify-end' : 'mb-6 flex justify-end'}>
              <div className={`border border-dashed border-slate-300 rounded p-2 ${
                isRecu ? 'h-8' : 'h-12'
              } w-48 flex flex-col justify-center`}>
                <p className="text-[9px] font-bold uppercase text-slate-500">Cachet et Signature</p>
                <p className="text-[8px] text-slate-400 italic">{data.shop.nom}</p>
              </div>
            </div>
          )}
          </div>
        )}
        </>
        )}

        {/* ── FOOTER — normal document flow (NOT absolute / NOT fixed) ────── */}
        <footer className={`border-t border-slate-200 text-[9px] text-slate-500 break-before-avoid recu-footer ${isRecu ? 'pt-2 mt-1' : 'pt-3 mt-4'}`}>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="font-bold uppercase mb-1 text-[8px]" style={{ color: primary }}>Conditions</p>
              {isBonCmd ? (
                <p>Ce bon de commande est établi conformément à nos conditions générales d’achat.</p>
              ) : isDevis ? (
                <p>Ce devis est valable {data.validityDays ?? 15} jours.</p>
              ) : isRecu ? (
                <p>Paiement reçu le {formatDate(data.date)}.</p>
              ) : (
                <>
                  <p>{data.shop.paymentTerms ?? 'Paiement comptant à réception.'}</p>
                  <p>Marchandise livrée, non reprise, non échangée.</p>
                </>
              )}
            </div>
            {config.showRIB && data.shop.rib && !isRecu && (
              <div className="text-right">
                <p className="font-bold uppercase mb-1 text-[8px]" style={{ color: primary }}>Coordonnées Bancaires</p>
                <p className="font-mono text-slate-600 text-[9px]">{data.shop.rib}</p>
              </div>
            )}
          </div>
          <div className={isRecu ? 'text-center mt-1' : 'text-center mt-4'}>
            {config.footerText ? (
              <p className="text-[8px] mb-1 whitespace-pre-wrap">{config.footerText}</p>
            ) : data.shop.mentionsLegales ? (
              <p className="text-[8px] mb-1">{data.shop.mentionsLegales}</p>
            ) : null}
            <p className="font-bold text-slate-900 italic text-[10px]">
              &quot;Merci de votre confiance&quot;
            </p>
            {!isRecu && (
              <p className="mt-0.5 text-[8px] text-slate-400">Généré par OptiManager Pro</p>
            )}
          </div>
        </footer>
      </div>

      {/* ── Global Print CSS ──────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm 10mm;
          }
          body {
            background-color: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .recu-footer {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
        }
      `}</style>
    </>
  );
}
