'use client';

import * as React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';

interface PrintDocumentTemplateProps {
    type: 'devis' | 'facture';
    data: {
        document: any;
        client: any;
        settings: any;
    };
}

export function PrintDocumentTemplate({ type, data }: PrintDocumentTemplateProps) {
    const { document, client, settings } = data;

    // Normalization
    const isDevis = type === 'devis';
    const title = isDevis ? 'DEVIS' : 'FACTURE';
    const dateLabel = isDevis ? 'Date' : 'Date';
    const dateValue = document.date || document.createdAt;

    // Normalize items
    const items = document.items || [];

    // Get TVA rate from settings (default to 20%)
    const tvaRate = settings?.tvaRate ? parseFloat(settings.tvaRate) : 20;
    const tvaMultiplier = 1 + (tvaRate / 100);

    // Calculations
    const totalHT = document.totalHT || (document.totalNet / tvaMultiplier) || 0;
    const totalTTC = document.totalTTC || document.totalNet || 0;
    const totalTVA = totalTTC - totalHT;
    const resteAPayer = document.resteAPayer || 0;

    // Payment methods from settings
    const paymentMethods = settings?.paymentMethods || ['Espèces', 'Chèque', 'Virement bancaire'];

    // Formatting helpers
    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return format(d, "dd/MM/yyyy", { locale: fr });
    };

    return (
        <>
            <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-8 md:p-10 shadow-lg print:shadow-none print:m-0 print:w-full print:h-[297mm] print:py-8 print:px-8 text-black relative">

                {/* Header: Shop Info & Document Meta */}
                <div className="flex justify-between items-start border-b-2 border-slate-300 pb-5 mb-6">
                    {/* School/Shop Info */}
                    <div className="flex gap-4 items-start">
                        {/* Logo */}
                        {settings?.logoUrl && (
                            <div className="relative h-24 w-36 flex-shrink-0">
                                <Image
                                    src={settings.logoUrl}
                                    alt="Logo"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        )}

                        <div className="space-y-0.5">
                            <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900 leading-none">
                                {settings?.storeName || settings?.shopName || 'OptiManager'}
                            </h1>
                            <div className="text-[10px] text-slate-600 leading-snug space-y-0.5">
                                <p>{settings?.address || 'Adresse non renseignée'}</p>
                                <p>{settings?.phone ? `Tél: ${settings.phone}` : ''}</p>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-500">
                                    {settings?.ice && <span>ICE: {settings.ice}</span>}
                                    {settings?.if && <span>IF: {settings.if}</span>}
                                    {settings?.rc && <span>RC: {settings.rc}</span>}
                                    {settings?.tp && <span>TP: {settings.tp}</span>}
                                    {settings?.inpe && <span>INPE: {settings.inpe}</span>}
                                    {/* Fallback for legacy Patente if TP not set */}
                                    {!settings?.tp && settings?.patente && <span>Patente: {settings.patente}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document Meta */}
                    <div className="text-right">
                        <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded mb-2">
                            <span className="text-base font-bold tracking-widest">{title}</span>
                        </div>
                        <div className="text-[10px] space-y-0.5">
                            <p className="font-semibold text-slate-900">N° {String(document.id || '').slice(0, 8).toUpperCase()}</p>
                            <p className="text-slate-600">{dateLabel}: {formatDate(dateValue)}</p>
                            {isDevis && (
                                <p className="text-slate-500">Validité: 15 jours</p>
                            )}
                            {!isDevis && document.status && (
                                <p className="text-slate-500 uppercase font-bold text-[9px] bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1 border border-slate-200">{document.status}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Client Information */}
                <div className="mb-6 flex justify-end">
                    <div className="w-[55%] p-4 rounded-lg border border-slate-200 bg-slate-50/80 print:bg-slate-50 print:border-slate-300">
                        <h3 className="text-[9px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Client</h3>
                        <div className="text-xs text-slate-900">
                            {client ? (
                                <>
                                    <p className="font-bold text-sm mb-1">{client.prenom} {client.nom}</p>
                                    <div className="text-slate-600 text-[10px] space-y-0.5">
                                        <p>{client.telephone1 || client.phone}</p>
                                        <p>{client.adresse || client.address}</p>
                                    </div>
                                    {(client.assuranceId || client.mutuelle) && (
                                        <div className="mt-1.5 text-[10px] text-blue-700 font-medium pt-1 border-t border-slate-200">
                                            Mutuelle: {client.assuranceId || client.mutuelle}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="font-bold text-sm">{document.clientName || 'Client Passage'}</p>
                                    <p className="text-slate-600 text-[10px]">{document.clientPhone}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white print:bg-slate-900 print:text-white">
                                <th className="py-2 pl-2 text-left text-[9px] font-bold uppercase tracking-wider w-[40%] rounded-tl-sm">Désignation</th>
                                <th className="py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[15%]">Marque</th>
                                <th className="py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[12%]">Modèle</th>
                                <th className="py-2 text-center text-[9px] font-bold uppercase tracking-wider w-[8%]">Qté</th>
                                <th className="py-2 text-right text-[9px] font-bold uppercase tracking-wider w-[12%]">P.U. HT</th>
                                <th className="py-2 pr-2 text-right text-[9px] font-bold uppercase tracking-wider w-[13%] rounded-tr-sm">Total HT</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px]">
                            {items.map((item: any, index: number) => {
                                const name = item.productName || item.nomProduit || item.designation;
                                const ref = item.productRef || item.reference;
                                const marque = item.marque || item.brand || '-';
                                const modele = item.modele || item.model || '-';
                                const couleur = item.couleur || item.color;
                                const qty = item.quantity || item.quantite;
                                const price = item.unitPrice || item.prixVente || item.prixUnitaire || 0;
                                const lineTotal = qty * price;

                                return (
                                    <tr key={index} className="border-b border-slate-100 last:border-0">
                                        <td className="py-2.5 pl-2 pr-2">
                                            <p className="font-semibold text-slate-900 leading-tight">{name}</p>
                                            {ref && <p className="text-[9px] text-slate-500 font-mono mt-0.5">Réf: {ref}</p>}
                                            {couleur && <p className="text-[9px] text-slate-600 mt-0.5">Couleur: {couleur}</p>}
                                        </td>
                                        <td className="py-2.5 text-slate-700">{marque}</td>
                                        <td className="py-2.5 text-slate-700">{modele}</td>
                                        <td className="py-2.5 text-center text-slate-600 font-medium">{qty}</td>
                                        <td className="py-2.5 text-right text-slate-600 font-medium">{price.toFixed(2)}</td>
                                        <td className="py-2.5 pr-2 text-right font-bold text-slate-900">{lineTotal.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mb-8">
                    <div className="w-64">
                        <div className="space-y-1.5 mb-2 px-3">
                            <div className="flex justify-between text-[10px] text-slate-600">
                                <span className="font-medium">Total HT</span>
                                <span>{totalHT.toFixed(2)} DH</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600">
                                <span className="font-medium">TVA ({tvaRate}%)</span>
                                <span>{totalTVA.toFixed(2)} DH</span>
                            </div>
                        </div>

                        {/* Total Block */}
                        <div className="bg-slate-900 text-white p-2.5 rounded shadow-sm print:bg-slate-900 print:text-white">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-medium uppercase tracking-wider opacity-80">Total TTC</span>
                                <span className="text-lg font-bold">{totalTTC.toFixed(2)} <span className="text-xs font-normal opacity-70">DH</span></span>
                            </div>
                        </div>

                        {!isDevis && resteAPayer > 0 && (
                            <div className="flex justify-between text-[10px] text-red-600 font-bold px-3 pt-2">
                                <span>Reste à Payer</span>
                                <span>{resteAPayer.toFixed(2)} DH</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Amount in Words */}
                <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded print:bg-slate-50 print:border-slate-200">
                    <p className="text-[9px] text-slate-600 mb-1">
                        {isDevis ? 'Arrêté le présent devis' : 'Arrêté la présente facture'} à la somme de :
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-900">
                        {totalTTC.toFixed(2)} DH ({formatCurrencyToWords(totalTTC)})
                    </p>
                </div>

                {/* Payment Methods */}
                {paymentMethods && paymentMethods.length > 0 && (
                    <div className="mb-6 p-3 border border-slate-200 rounded bg-white">
                        <p className="text-[9px] font-bold uppercase text-slate-700 mb-1.5">Modes de paiement acceptés</p>
                        <p className="text-[10px] text-slate-600">{paymentMethods.join(' • ')}</p>
                    </div>
                )}

                {/* Signature and Stamp Area */}
                <div className="mb-8 grid grid-cols-2 gap-6">
                    <div className="border border-dashed border-slate-300 rounded p-3 h-24">
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Signature du Client</p>
                        <p className="text-[8px] text-slate-400 italic">Lu et approuvé</p>
                    </div>
                    <div className="border border-dashed border-slate-300 rounded p-3 h-24">
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Cachet et Signature</p>
                        <p className="text-[8px] text-slate-400 italic">{settings?.shopName || 'OptiManager'}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 left-8 right-8 pt-4 border-t border-slate-200 text-[9px] text-slate-500 print:bottom-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="font-bold uppercase text-slate-700 mb-1 text-[8px]">Conditions</p>
                            {isDevis ? (
                                <>
                                    <p>Ce devis est valable 15 jours.</p>
                                    <p>Pour accord, merci de retourner ce devis signé.</p>
                                </>
                            ) : (
                                <>
                                    <p>{settings?.paymentTerms || 'Paiement comptant à réception.'}</p>
                                    <p>Marchandise livrée, non reprise, non échangée.</p>
                                </>
                            )}
                        </div>

                        {settings?.rib && (
                            <div className="text-right">
                                <p className="font-bold uppercase text-slate-700 mb-1 text-[8px]">Coordonnées Bancaires</p>
                                <p className="font-mono text-slate-600 text-[9px]">{settings.rib}</p>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-4">
                        <p className="font-bold text-slate-900 italic text-[10px]">"Merci de votre confiance"</p>
                        <p className="mt-0.5 text-[8px] text-slate-400">Généré par OptiManager Pro</p>
                    </div>
                </div>
            </div>

            {/* Global Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        background-color: white;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </>
    );
}
