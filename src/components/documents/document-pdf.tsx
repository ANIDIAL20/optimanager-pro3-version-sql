'use client';

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types matching the DB structure (simplified for display)
interface DocumentItem {
  id: number;
  label: string;
  qty: number;
  unitPriceHT: string | number;
  unitPriceTVA: string | number;
  unitPriceTTC: string | number;
  lineTotalHT: string | number;
  lineTotalTVA: string | number;
  lineTotalTTC: string | number;
  tvaRate: string | number;
  productType: string;
  lensDetails: any[];
  contactLensDetails: any[];
}

interface DocumentData {
  type: string;
  saleNumber: string;
  date: Date | string;
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  clientMutuelle?: string;
  totalHT: string | number;
  totalTVA: string | number;
  totalTTC: string | number;
  saleItems: DocumentItem[];
  notes?: string;
}

interface ShopProfile {
  shopName: string;
  address?: string;
  phone?: string;
  email?: string;
  ice?: string;
  rc?: string;
  if?: string;
  tp?: string; // Taxe Pro
  rib?: string;
  logoUrl?: string; // Optional
}

export function DocumentPDF({ data, shopProfile }: { data: DocumentData, shopProfile: ShopProfile }) {
  // Helper to format currency
  const formatMoney = (amount: string | number) => {
    return Number(amount).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' });
  };

  const renderOpticalDetails = (item: DocumentItem) => {
    if (item.productType === 'lens' && item.lensDetails && item.lensDetails.length > 0) {
      return (
        <div className="mt-1 text-xs text-gray-600 pl-4 border-l-2 border-gray-300">
           {item.lensDetails.map((detail, idx) => (
             <div key={idx} className="grid grid-cols-6 gap-2 mb-1">
               <span className="font-bold w-6">{detail.eye}</span>
               <span>Sph: {detail.sphere}</span>
               <span>Cyl: {detail.cylinder}</span>
               <span>Axe: {detail.axis}°</span>
               {detail.addition && <span>Add: {detail.addition}</span>}
               {detail.treatment && <span className="col-span-2">Trt: {detail.treatment}</span>}
             </div>
           ))}
        </div>
      );
    }
    if (item.productType === 'contact_lens' && item.contactLensDetails && item.contactLensDetails.length > 0) {
        return (
            <div className="mt-1 text-xs text-gray-600 pl-4 border-l-2 border-gray-300">
               {item.contactLensDetails.map((detail, idx) => (
                 <div key={idx} className="grid grid-cols-4 gap-2 mb-1">
                   <span className="font-bold w-6">{detail.eye}</span>
                   <span>Pwr: {detail.power}</span>
                   <span>BC: {detail.baseCurve}</span>
                   <span>DIA: {detail.diameter}</span>
                 </div>
               ))}
            </div>
          );
    }
    return null;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-sm relative" id="printable-document">
        
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <div className="w-1/2">
           {shopProfile.logoUrl && <img src={shopProfile.logoUrl} alt="Logo" className="h-16 mb-2" />}
           <h1 className="text-xl font-bold uppercase text-primary">{shopProfile.shopName}</h1>
           <p className="text-gray-600 space-y-1">
             <span className="block">{shopProfile.address}</span>
             <span className="block">Tél: {shopProfile.phone}</span>
             <span className="block">{shopProfile.email}</span>
           </p>
        </div>
        <div className="w-1/2 text-right">
           <h2 className="text-2xl font-bold text-gray-800">
             {data.type === 'INVOICE' ? 'FACTURE' : 'DEVIS'}
           </h2>
           <div className="mt-2 space-y-1">
             <p className="text-lg text-gray-700 font-medium">N° {data.saleNumber}</p>
             <p className="text-gray-600">Date: {format(new Date(data.date), 'dd/MM/yyyy', { locale: fr })}</p>
           </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="flex justify-end mb-8">
        <div className="w-1/2 bg-gray-50 border rounded-lg p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Client</h3>
            <p className="text-lg font-bold text-gray-900">{data.clientName}</p>
            {data.clientAddress && <p className="text-gray-600">{data.clientAddress}</p>}
            {data.clientPhone && <p className="text-gray-600">Tél: {data.clientPhone}</p>}
            {data.clientMutuelle && <p className="text-gray-600 text-xs mt-1">Mutuelle: {data.clientMutuelle}</p>}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200 text-xs text-gray-600 uppercase tracking-wider">
            <th className="text-left p-3">Désignation</th>
            <th className="text-center p-3 w-16">Qté</th>
            <th className="text-right p-3 w-24">P.U. HT</th>
            <th className="text-right p-3 w-20">TVA</th>
            <th className="text-right p-3 w-24">Total TTC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
           {data.saleItems.map((item, index) => (
             <tr key={index} className="hover:bg-gray-50">
               <td className="p-3">
                 <div className="font-medium text-gray-900">{item.label}</div>
                 {/* Optical Details Sub-row */}
                 {renderOpticalDetails(item)}
               </td>
               <td className="p-3 text-center">{item.qty}</td>
               <td className="p-3 text-right text-gray-600">{Number(item.unitPriceHT).toFixed(2)}</td>
               <td className="p-3 text-right text-gray-600">{Number(item.tvaRate)}%</td>
               <td className="p-3 text-right font-medium">{Number(item.lineTotalTTC).toFixed(2)}</td>
             </tr>
           ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-2">
           <div className="flex justify-between text-gray-600">
             <span>Total HT</span>
             <span>{formatMoney(data.totalHT)}</span>
           </div>
           <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
             <span>Total TVA</span>
             <span>{formatMoney(data.totalTVA)}</span>
           </div>
           
           <div className="flex justify-between pt-2 text-xl font-bold text-gray-900">
             <span>Net à Payer</span>
             <span>{formatMoney(data.totalTTC)}</span>
           </div>
           
           {/* Optional breakdown if multiple rates were used, can be added here */}
        </div>
      </div>
      
      {/* Notes */}
      {data.notes && (
          <div className="mb-8 p-4 bg-yellow-50 rounded border border-yellow-100 text-sm">
              <span className="font-bold text-yellow-800">Notes:</span> {data.notes}
          </div>
      )}

      {/* Legal Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-gray-400">
         <div className="border-t pt-2 mx-8">
             <p>{shopProfile.shopName} - {shopProfile.address}</p>
             <p>
                ICE: {shopProfile.ice || '-'} | 
                RC: {shopProfile.rc || '-'} | 
                IF: {shopProfile.if || '-'} | 
                TP: {shopProfile.tp || '-'}
             </p>
             {shopProfile.rib && <p>RIB: {shopProfile.rib}</p>}
         </div>
      </div>
    </div>
  );
}
