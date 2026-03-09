'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import {
  DocumentTemplateConfig,
  DEFAULT_TEMPLATE_CONFIG
} from '@/types/document-template';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { AutoPrint } from '@/components/printing/auto-print';
import type { StandardDocumentData } from '@/types/document';
import { usePrintTitle } from '@/hooks/use-print-title';
import { generateDocumentFilename } from '@/lib/pdf-filenames';

// ────────────────────────────────────────────────────────────
// Types (exported so document-settings-form.tsx can use them)
// ────────────────────────────────────────────────────────────

export interface LensOrderData {
  id: number;
  orderType: string;
  lensType: string;
  treatment: string | null;
  supplierName: string;
  // OD
  sphereR: string | null;
  cylindreR: string | null;
  axeR: string | null;
  additionR: string | null;
  hauteurR: string | null;
  ecartPupillaireR: string | null;
  diameterR: string | null;
  // OG
  sphereL: string | null;
  cylindreL: string | null;
  axeL: string | null;
  additionL: string | null;
  hauteurL: string | null;
  ecartPupillaireL: string | null;
  diameterL: string | null;
  // Other
  matiere: string | null;
  indice: string | null;
  pont: string | null;
  branches: string | null;
  quantity: number;
  sellingPrice: string;
  notes: string | null;
  status: string;
  orderDate: string | null;
  createdAt: string | null;
  client: {
    id: number;
    fullName: string;
    phone: string | null;
    email: string | null;
  } | null;
}

export interface ShopData {
  shopName: string;
  address: string | null;
  phone: string | null;
  ice: string | null;
  logoUrl: string | null;
}

export interface Props {
  data: {
    order: LensOrderData;
    shop: ShopData | null;
  };
  config?: DocumentTemplateConfig;
  /** false = settings preview (no Back/Print toolbar, no outer page wrapper) */
  showToolbar?: boolean;
}

// ────────────────────────────────────────────────────────────
// Prescription row helper
// ────────────────────────────────────────────────────────────

function PrescRow({
  label,
  sph, cyl, axe, add, ep, haut, diam,
  isBold,
  primaryColor,
}: {
  label: string;
  sph: string | null;
  cyl: string | null;
  axe: string | null;
  add: string | null;
  ep: string | null;
  haut: string | null;
  diam: string | null;
  isBold?: boolean;
  primaryColor?: string;
}) {
  const cell = (v: string | null) => v ?? '—';
  const cls = `border border-gray-200 p-2 text-center text-sm ${isBold ? 'font-bold' : ''}`;
  return (
    <tr>
      <td className={`${cls} text-center font-bold`} style={primaryColor ? { color: primaryColor } : {}}>{label}</td>
      <td className={cls}>{cell(sph)}</td>
      <td className={cls}>{cell(cyl)}</td>
      <td className={cls}>{cell(axe) !== '—' ? `${cell(axe)}°` : '—'}</td>
      <td className={cls}>{cell(add)}</td>
      <td className={cls}>{cell(ep)}</td>
      <td className={cls}>{cell(haut)}</td>
      <td className={cls}>{cell(diam)}</td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────
// Inner component — uses useSearchParams (must be inside Suspense)
// ────────────────────────────────────────────────────────────

function LensOrderPrintInner({ data, config, showToolbar = true }: Props) {
  const { order, shop } = data;
  const searchParams = useSearchParams();
  const router = useRouter();

  const cfg = config ?? DEFAULT_TEMPLATE_CONFIG;
  const primary = cfg.primaryColor ?? '#1d4ed8';

  // DEV DIAGNOSTIC - Verifying Payload Transmission
  if (typeof window !== 'undefined') {
    console.log('Order data explicitly mapped to Print Frontend:', {
       orderId: order.id,
       pont: order.pont,
       branches: order.branches,
       matiere: order.matiere,
       indice: order.indice,
       treatment: order.treatment,
       diameterR: order.diameterR,
       diameterL: order.diameterL
    });
  }

  const shouldAutoPrint = showToolbar && (
    searchParams.get('autoprint') === 'true' || searchParams.get('auto') === 'true'
  );

  // Synchronous document.title out-racing AutoPrint (with cleanup)
  usePrintTitle(
    generateDocumentFilename(
        'Commande',
        `BCL-${String(order.id).padStart(4, '0')}`,
        order.client?.fullName || 'Client'
    )
  );


  const dateLabel = order.orderDate
    ? format(new Date(order.orderDate), 'dd MMMM yyyy', { locale: fr })
    : order.createdAt
    ? format(new Date(order.createdAt), 'dd MMMM yyyy', { locale: fr })
    : '—';

  const statusLabels: Record<string, string> = {
    pending: 'En Attente',
    ordered: 'Commandée',
    received: 'Reçue',
    delivered: 'Livrée',
  };

  const standardData: StandardDocumentData = {
    type: 'BON DE COMMANDE',
    documentNumber: `BCL-${String(order.id).padStart(4, '0')}`,
    date: order.orderDate
      ? new Date(order.orderDate).toISOString()
      : order.createdAt
      ? new Date(order.createdAt).toISOString()
      : new Date().toISOString(),
    status: statusLabels[order.status] ?? order.status,
    shop: {
      nom: shop?.shopName ?? 'Opticien',
      adresse: shop?.address ?? '',
      telephone: shop?.phone ?? '',
      ice: shop?.ice ?? '',
      logoUrl: shop?.logoUrl ?? undefined,
    },
    // We omit fournisseur so PrintDocumentTemplate doesn't render its standard block
    items: [],
    totals: { sousTotal: 0, totalTTC: 0 },
  };

  // ── Shared prescription + lens + notes + signatures JSX ──────────────────
  const customContent = (
    <>
      {/* ── VENDOR + CLIENT GRID ── */}
      <div className="grid grid-cols-2 gap-4 print:gap-2 mb-4 print:mb-1">
        {/* Fournisseur */}
        <div className="border border-gray-200 rounded-lg p-4 print:p-2 border-l-4" style={{ borderLeftColor: primary }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Fournisseur / Laboratoire
          </p>
          {order.supplierName ? (
            <p className="font-bold text-gray-800 text-base">{order.supplierName}</p>
          ) : (
            <div className="border-b border-dashed border-gray-300 py-2" />
          )}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Date de livraison souhaitée :</p>
            <div className="border-b border-dashed border-gray-300 mt-1 pb-1" />
          </div>
        </div>

        {/* Client Reference */}
        <div className="border border-gray-200 rounded-lg p-4 print:p-2 border-l-4" style={{ borderLeftColor: primary }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Client (référence interne)
          </p>
          <p className="font-bold text-gray-800 text-base">
            {order.client?.fullName ?? '—'}
          </p>
          {order.client?.phone && (
            <p className="text-sm text-gray-500 mt-1">📞 {order.client.phone}</p>
          )}
        </div>
      </div>

      {/* ── PRESCRIPTION TABLE ── */}
      <div className="mb-4 print:mb-1">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: primary }} />
          Mesures de Prescription
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: primary, color: 'white' }}>
                <th className="border border-gray-200 p-2 text-left font-semibold w-12 border-white/20">Œil</th>
                <th className="border border-gray-200 p-2 text-center font-semibold border-white/20">Sphère</th>
                <th className="border border-gray-200 p-2 text-center font-semibold border-white/20">Cylindre</th>
                <th className="border border-gray-200 p-2 text-center font-semibold border-white/20">Axe</th>
                <th className="border border-gray-200 p-2 text-center font-semibold border-white/20">Addition</th>
                <th className="border border-gray-200 p-2 text-center font-semibold border-white/20">E.P.</th>
                <th className="border border-gray-200 p-2 text-center font-semibold border-white/20">Hauteur</th>
                <th className="border border-gray-200 p-2 text-center font-semibold border-white/20">Diamètre</th>
              </tr>
            </thead>
            <tbody>
              <PrescRow
                label="OD"
                sph={order.sphereR} cyl={order.cylindreR} axe={order.axeR}
                add={order.additionR} ep={order.ecartPupillaireR}
                haut={order.hauteurR} diam={order.diameterR}
                primaryColor={primary}
              />
              <PrescRow
                label="OG"
                sph={order.sphereL} cyl={order.cylindreL} axe={order.axeL}
                add={order.additionL} ep={order.ecartPupillaireL}
                haut={order.hauteurL} diam={order.diameterL}
                primaryColor={primary}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── LENS SPECIFICATIONS & MONTAGE ── */}
      <div className="mb-4 print:mb-1 break-inside-avoid">
        {/* LENS SPECS */}
        <div className="mb-4 print:mb-1">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: primary }} />
            Caractéristiques des Verres
          </h2>
          <div className="grid grid-cols-4 gap-3 print:gap-1 mb-3 print:mb-1">
            {[
              { label: 'Géométrie',      value: order.orderType },
              { label: 'Type de Verre',  value: order.lensType },
              { label: 'Indice',         value: order.indice },
              { label: 'Matière',        value: order.matiere },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gray-200 rounded-lg p-2 border-l-4" style={{ borderLeftColor: primary }}>
                <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                <p className="font-semibold text-gray-800 text-xs">{value || 'N/A'}</p>
              </div>
            ))}
          </div>
          <div className="border border-gray-200 rounded-lg p-2 border-l-4" style={{ borderLeftColor: primary }}>
            <p className="text-[10px] text-gray-400 mb-0.5">Traitement</p>
            <p className="font-semibold text-gray-800 text-xs">{Array.isArray(order.treatment) ? order.treatment.join(', ') : (order.treatment || 'N/A')}</p>
          </div>
        </div>

        {/* MONTAGE */}
        <div className="space-y-4 print:space-y-1">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 print:mb-1 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: primary }} />
            Mesures de Montage
          </h2>
          <div className="grid grid-cols-2 gap-3 print:gap-1">
             <div className="border border-gray-200 rounded-lg p-2 border-l-4" style={{ borderLeftColor: primary }}>
                <p className="text-[10px] text-gray-400 mb-0.5">Pont</p>
                <p className="font-semibold text-gray-800 text-xs">{order.pont || 'N/A'}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-2 border-l-4" style={{ borderLeftColor: primary }}>
                <p className="text-[10px] text-gray-400 mb-0.5">Branches</p>
                <p className="font-semibold text-gray-800 text-xs">{order.branches || 'N/A'}</p>
              </div>
          </div>
        </div>
      </div>

      {/* ── NOTES ── */}
      <div className="mb-4 print:mb-1 notes-section">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: primary }} />
          Notes / Observations
        </h2>
        <div className="border border-gray-200 rounded-lg p-4 print:p-2 min-h-[72px] print:min-h-[40px] border-l-4" style={{ borderLeftColor: primary }}>
          {order.notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          ) : (
            <div className="space-y-3">
              <div className="border-b border-dashed border-gray-200" />
              <div className="border-b border-dashed border-gray-200" />
              <div className="border-b border-dashed border-gray-200" />
            </div>
          )}
        </div>
      </div>

      {/* ── SIGNATURES ── */}
      {cfg.showSignatureBox && (
        <div className="mt-4 flex justify-between pt-4 border-t border-gray-200 signature-section">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Signature &amp; Cachet Fournisseur</p>
            <div className="w-44 border-b border-gray-400 mx-auto" />
            <p className="text-xs text-gray-400 mt-1">Bon pour accord</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Signature Magasin</p>
            <div className="w-44 border-b border-gray-400 mx-auto" />
            <p className="text-xs text-gray-400 mt-1">Le responsable</p>
          </div>
        </div>
      )}
    </>
  );

  // FIX 2: When showToolbar=false (settings preview), skip the page wrapper
  // and the toolbar — render PrintDocumentTemplate bare so A4 scale works.
  if (!showToolbar) {
    return (
      <PrintDocumentTemplate
        data={standardData}
        config={cfg}
        showToolbar={false}
        customContent={customContent}
      />
    );
  }

  // Normal print page — full wrapper with AutoPrint + toolbar
  return (
    <>
      <style>{`
        /* Force single page globally for Print views */
        @media print {
          @page { size: A4; margin: 8mm; }
          html, body {
            width: 210mm;
            height: auto !important;
            min-height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          nav, header { display: none !important; }
          * {
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .print-container {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            page-break-after: avoid;
            break-after: avoid;
          }
        }
      `}</style>
      
      {shouldAutoPrint && <AutoPrint />}

      <div 
        className="print-container bg-white mx-auto shadow-sm relative print:shadow-none"
        style={{
          width: '210mm',
          height: '297mm',
          maxHeight: '297mm',
          overflow: 'hidden',
          pageBreakAfter: 'avoid',
          padding: '0', 
        }}
      >
        <PrintDocumentTemplate
          data={standardData}
          config={cfg}
          showToolbar={true}
          onBack={() => router.back()}
          customContent={customContent}
        />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Exported component — wraps inner in Suspense (fixes useSearchParams warning)
// ────────────────────────────────────────────────────────────

export function LensOrderPrintClient(props: Props) {
  return (
    <Suspense fallback={<div className="w-[210mm] h-[297mm] bg-white" />}>
      <LensOrderPrintInner {...props} />
    </Suspense>
  );
}
