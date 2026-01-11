'use client';

import * as React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    const dateValue = document.date || document.createdAt; // Handle different field names

    // Normalize items
    const items = document.items || [];

    // Calculations
    const totalHT = document.totalHT || (document.totalNet / 1.2) || 0; // Fallback calculation if not stored
    const totalTTC = document.totalTTC || document.totalNet || 0;
    const totalTVA = totalTTC - totalHT;
    const resteAPayer = document.resteAPayer || 0;

    // Formatting helpers
    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return format(d, "dd/MM/yyyy", { locale: fr });
    };

    return (
        <>
            <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-10 md:p-12 shadow-lg print:shadow-none print:m-0 print:w-[210mm] print:h-[297mm] print:p-10 text-black relative">

                {/* Header: Shop Info & Document Meta */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-8">
                    {/* School/Shop Info */}
                    <div className="flex gap-5 items-center">
                        {/* Logo */}
                        {settings?.logoUrl && (
                            <div className="relative h-20 w-20">
                                <Image
                                    src={settings.logoUrl}
                                    alt="Logo"
                                    fill
                                    className="object-contain"
                                    unoptimized // Important for external URLs in print
                                />
                            </div>
                        )}

                        <div className="space-y-0.5">
                            <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900 leading-none">
                                {settings?.storeName || 'OptiManager'}
                            </h1>
                            <div className="text-xs text-slate-500 leading-snug">
                                <p>{settings?.address || 'Adresse non renseignée'}</p>
                                <p>{settings?.phone ? `Tél: ${settings.phone}` : ''}</p>
                                <div className="mt-1 flex flex-col gap-0 text-[10px] text-slate-400">
                                    {settings?.ice && <span>ICE: {settings.ice}</span>}
                                    {settings?.rc && <span>RC: {settings.rc}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document Meta */}
                    <div className="text-right">
                        <div className="inline-block bg-slate-100 px-3 py-1 rounded mb-2">
                            <span className="text-lg font-bold text-slate-800 tracking-widest">{title}</span>
                        </div>
                        <div className="text-xs space-y-1">
                            <p className="font-semibold text-slate-900">N° {document.id?.slice(0, 8).toUpperCase()}</p>
                            <p className="text-slate-600">{dateLabel}: {formatDate(dateValue)}</p>
                            {isDevis && (
                                <p className="text-slate-500">Validité: 15 jours</p>
                            )}
                            {!isDevis && document.status && (
                                <p className="text-slate-500 uppercase font-bold text-[10px] bg-slate-50 px-1 py-0.5 rounded inline-block mt-1 border border-slate-100">{document.status}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Client Information */}
                <div className="mb-8 flex justify-end">
                    <div className="w-[55%] p-5 rounded-lg border border-slate-100 bg-slate-50/50 print:bg-slate-50 print:border-slate-200">
                        <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider">Client</h3>
                        <div className="text-sm text-slate-900">
                            {client ? (
                                <>
                                    <p className="font-bold text-base mb-1">{client.prenom} {client.nom}</p>
                                    <div className="text-slate-600 text-xs space-y-0.5">
                                        <p>{client.telephone1 || client.phone}</p>
                                        <p>{client.adresse || client.address}</p>
                                    </div>
                                    {(client.assuranceId || client.mutuelle) && (
                                        <div className="mt-2 text-xs text-blue-700 font-medium pt-1.5 border-t border-slate-200/50">
                                            Mutuelle: {client.assuranceId || client.mutuelle}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="font-bold text-base">{document.clientName || 'Client Passage'}</p>
                                    <p className="text-slate-600 text-xs">{document.clientPhone}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white print:bg-slate-900 print:text-white">
                                <th className="py-2 pl-3 text-left text-[10px] font-bold uppercase tracking-wider w-[55%] rounded-l-sm">Désignation</th>
                                <th className="py-2 text-center text-[10px] font-bold uppercase tracking-wider">Qté</th>
                                <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider">P.U. HT</th>
                                <th className="py-2 pr-3 text-right text-[10px] font-bold uppercase tracking-wider rounded-r-sm">Total HT</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {items.map((item: any, index: number) => {
                                const name = item.productName || item.nomProduit || item.designation;
                                const ref = item.productRef || item.reference;
                                const qty = item.quantity || item.quantite;
                                const price = item.unitPrice || item.prixVente || item.prixUnitaire || 0;
                                const lineTotal = qty * price;

                                return (
                                    <tr key={index} className="border-b border-slate-100 last:border-0">
                                        <td className="py-3 pl-3 pr-2">
                                            <p className="font-semibold text-slate-900">{name}</p>
                                            {ref && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{ref}</p>}
                                        </td>
                                        <td className="py-3 text-center text-slate-600 font-medium">{qty}</td>
                                        <td className="py-3 text-right text-slate-600 font-medium">{price.toFixed(2)}</td>
                                        <td className="py-3 pr-3 text-right font-bold text-slate-900">{lineTotal.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mb-12">
                    <div className="w-64">
                        <div className="space-y-2 mb-3 px-3">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span className="font-medium">Total HT</span>
                                <span>{totalHT.toFixed(2)} DH</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                                <span className="font-medium">TVA (20%)</span>
                                <span>{totalTVA.toFixed(2)} DH</span>
                            </div>
                        </div>

                        {/* Total Block */}
                        <div className="bg-slate-900 text-white p-3 rounded shadow-sm print:bg-slate-900 print:text-white">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">Total TTC</span>
                                <span className="text-xl font-bold">{totalTTC.toFixed(2)} <span className="text-xs font-normal opacity-70">DH</span></span>
                            </div>
                        </div>

                        {!isDevis && resteAPayer > 0 && (
                            <div className="flex justify-between text-xs text-red-600 font-bold px-3 pt-2">
                                <span>Reste à Payer</span>
                                <span>{resteAPayer.toFixed(2)} DH</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer sticking to bottom of A4 if possible, or just at end */}
                <div className="absolute bottom-10 left-10 right-10 pt-6 border-t border-slate-100 text-[10px] text-slate-500 print:bottom-10">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="font-bold uppercase text-slate-700 mb-1.5 text-[9px]">Conditions</p>
                            {isDevis ? (
                                <>
                                    <p>Ce devis est valable 15 jours.</p>
                                    <p>Pour accord, merci de retourner ce devis signé.</p>
                                </>
                            ) : (
                                <>
                                    <p>Paiement comptant à réception.</p>
                                    <p>Marchandise livrée, non reprise, non échangée.</p>
                                </>
                            )}
                        </div>

                        {settings?.rib && (
                            <div className="text-right">
                                <p className="font-bold uppercase text-slate-700 mb-1.5 text-[9px]">Coordonnées Bancaires</p>
                                <p className="font-mono text-slate-600">{settings.rib}</p>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-8">
                        <p className="font-bold text-slate-900 italic">"Merci de votre confiance"</p>
                        <p className="mt-1 text-[9px] text-slate-400">Généré par OptiManager Pro</p>
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
                    /* Hide browser default headers/footers if possible, though @page margin 0 usually handles it */
                }
            `}</style>
        </>
    );
}
