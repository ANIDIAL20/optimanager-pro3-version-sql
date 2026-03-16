'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Download, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SaleRow } from '@/types/accounting';

interface ExportsClientProps {
    officialSales: SaleRow[];
    horsbilanSales: SaleRow[];
    allSales: SaleRow[];
    // FIX: 2 - Added dateRange to props to dynamically generate CSV filenames
    dateRange?: string;
}

const safeNum = (v: number | undefined | null) => Number(v) || 0;

const fmt = (v: number) => v.toFixed(2) + ' MAD';

function downloadCsv(content: string, filename: string) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getMonthYear() {
    return format(new Date(), 'MM-yyyy', { locale: fr });
}

function StatusBadge({ status, isPaid }: { status: string; isPaid: boolean }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'text-[10px] font-semibold',
                isPaid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-orange-50 text-orange-700 border-orange-200'
            )}
        >
            {isPaid ? 'Payé' : 'Impayé'}
        </Badge>
    );
}

// ─── Tab: Comptabilité (Official) ────────────────────────────────────────────

// FIX: 2 - Pass range string to determine dynamic filename
function TabComptabilite({ sales, range = 'ce-mois' }: { sales: SaleRow[]; range?: string }) {
    const handleExport = () => {
        const headers = ['N°Facture', 'Date', 'Client', 'MontantHT', 'TVA20', 'MontantTTC', 'ModeReglement'];
        const rows = sales.map(s => {
            const ttc = safeNum(s.totalTTC);
            const ht = ttc / 1.20;
            const tva = ttc - ht;
            
            // FIX: BUG 2 - Sanitize sale number
            const saleNumCsv = s.saleNumber?.startsWith('SALE-') 
                ? String(s.id).slice(0, 8) 
                : (s.saleNumber || String(s.id));
                
            return [
                saleNumCsv,
                s.date,
                `"${s.clientName.replace(/"/g, '""')}"`,
                ht.toFixed(2),
                tva.toFixed(2),
                ttc.toFixed(2),
                // FIX: BUG 3 - Neutral dash
                s.paymentMethod || '—',
            ].join(';');
        });
        
        // FIX: 2 - Use dynamic range for filename
        const filenameRange = range === 'today' ? format(new Date(), 'dd-MM-yyyy') : 
                              range === 'yesterday' ? format(new Date(Date.now() - 86400000), 'dd-MM-yyyy') : 
                              range === 'thisYear' ? format(new Date(), 'yyyy') : 
                              range === 'lastMonth' ? format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MM-yyyy') : 
                              range.includes('_') ? range : getMonthYear();
        
        downloadCsv([headers.join(';'), ...rows].join('\n'), `comptabilite-${filenameRange}.csv`);
    };

    const totalTTC = sales.reduce((sum, s) => sum + safeNum(s.totalTTC), 0);
    const totalHT = totalTTC / 1.20;
    const totalTVA = totalTTC - totalHT;

    return (
        <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium mb-1">CA TTC</p>
                    <p className="text-2xl font-bold text-emerald-800">{fmt(totalTTC)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">CA HT</p>
                    <p className="text-2xl font-bold text-slate-700">{fmt(totalHT)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium mb-1">TVA 20% à reverser</p>
                    <p className="text-2xl font-bold text-blue-800">{fmt(totalTVA)}</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{sales.length} vente(s) officielle(s)</p>
                <Button onClick={handleExport} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Download className="h-4 w-4" />
                    Exporter CSV Comptable
                </Button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-medium">
                        <tr>
                            <th className="px-4 py-3 text-left border-b">N° Facture</th>
                            <th className="px-4 py-3 text-left border-b">Date</th>
                            <th className="px-4 py-3 text-left border-b">Client</th>
                            <th className="px-4 py-3 text-right border-b">HT</th>
                            <th className="px-4 py-3 text-right border-b">TVA 20%</th>
                            <th className="px-4 py-3 text-right border-b">TTC</th>
                            <th className="px-4 py-3 text-center border-b">Règlement</th>
                            <th className="px-4 py-3 text-center border-b">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-10 text-slate-400">
                                    Aucune vente officielle trouvée.
                                </td>
                            </tr>
                        ) : sales.map(s => {
                            const ttc = safeNum(s.totalTTC);
                            const ht = ttc / 1.20;
                            const tva = ttc - ht;
                            const isPaid = safeNum(s.resteAPayer) <= 0.01;
                            
                            // FIX: BUG 2 - UI format
                            const displayNumber = /^\d{4}-\d{4,}$/.test(s.saleNumber ?? '')
                                ? s.saleNumber
                                : `#${String(s.id).slice(0, 8)}`;
                                
                            return (
                                <tr key={s.id} className="border-b hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-800">{displayNumber}</td>
                                    <td className="px-4 py-3 text-slate-600">{s.date}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">{s.clientName}</td>
                                    <td className="px-4 py-3 text-right text-slate-700">{fmt(ht)}</td>
                                    <td className="px-4 py-3 text-right text-blue-600 font-medium">{fmt(tva)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(ttc)}</td>
                                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                                        {/* FIX: BUG 3 - UI dash */}
                                        {s.paymentMethod || <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={s.status} isPaid={isPaid} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Tab: Hors-Bilan ─────────────────────────────────────────────────────────

// FIX: 2 - Pass range string to determine dynamic filename
function TabHorsBilan({ sales, range = 'ce-mois' }: { sales: SaleRow[]; range?: string }) {
    const handleExport = () => {
        const headers = ['N°', 'Date', 'Client', 'Total', 'Payé', 'Reste', 'Statut'];
        const rows = sales.map(s => {
            // FIX: BUG 2 - Sanitize sale number
            const saleNumCsv = s.saleNumber?.startsWith('SALE-') 
                ? String(s.id).slice(0, 8) 
                : (s.saleNumber || String(s.id));
                
            return [
                saleNumCsv,
                s.date,
                `"${s.clientName.replace(/"/g, '""')}"`,
                safeNum(s.totalTTC).toFixed(2),
                safeNum(s.totalPaye).toFixed(2),
                safeNum(s.resteAPayer).toFixed(2),
                s.status || '—',
            ].join(';');
        });
        
        // FIX: 2 - Use dynamic range for filename
        const filenameRange = range === 'today' ? format(new Date(), 'dd-MM-yyyy') : 
                              range === 'yesterday' ? format(new Date(Date.now() - 86400000), 'dd-MM-yyyy') : 
                              range === 'thisYear' ? format(new Date(), 'yyyy') : 
                              range === 'lastMonth' ? format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MM-yyyy') : 
                              range.includes('_') ? range : getMonthYear();
                              
        downloadCsv([headers.join(';'), ...rows].join('\n'), `hors-bilan-${filenameRange}.csv`);
    };

    const totalTTC = sales.reduce((sum, s) => sum + safeNum(s.totalTTC), 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-semibold px-3">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        HORS-BILAN
                    </Badge>
                    <p className="text-sm text-slate-500">{sales.length} vente(s) — Total: <span className="font-bold text-slate-800">{fmt(totalTTC)}</span></p>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
                    <Download className="h-4 w-4" />
                    Exporter CSV Hors-Bilan
                </Button>
            </div>

            <div className="rounded-xl border border-orange-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-orange-50 text-orange-600 text-xs font-medium">
                        <tr>
                            <th className="px-4 py-3 text-left border-b border-orange-100">N°</th>
                            <th className="px-4 py-3 text-left border-b border-orange-100">Date</th>
                            <th className="px-4 py-3 text-left border-b border-orange-100">Client</th>
                            <th className="px-4 py-3 text-right border-b border-orange-100">Total</th>
                            <th className="px-4 py-3 text-right border-b border-orange-100">Payé</th>
                            <th className="px-4 py-3 text-right border-b border-orange-100">Reste</th>
                            <th className="px-4 py-3 text-center border-b border-orange-100">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-slate-400">
                                    Aucune vente hors-bilan trouvée.
                                </td>
                            </tr>
                        ) : sales.map(s => {
                            const isPaid = safeNum(s.resteAPayer) <= 0.01;
                            
                            // FIX: BUG 2 - UI format
                            const displayNumber = /^\d{4}-\d{4,}$/.test(s.saleNumber ?? '')
                                ? s.saleNumber
                                : `#${String(s.id).slice(0, 8)}`;
                                
                            return (
                                <tr key={s.id} className="border-b hover:bg-orange-50/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-700">{displayNumber}</td>
                                    <td className="px-4 py-3 text-slate-600">{s.date}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">{s.clientName}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(safeNum(s.totalTTC))}</td>
                                    <td className="px-4 py-3 text-right text-emerald-700">{fmt(safeNum(s.totalPaye))}</td>
                                    <td className="px-4 py-3 text-right text-orange-700 font-medium">{fmt(safeNum(s.resteAPayer))}</td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={s.status} isPaid={isPaid} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Tab: Toutes ─────────────────────────────────────────────────────────────

// FIX: 2 - Pass range string to determine dynamic filename
function TabToutes({ sales, range = 'ce-mois' }: { sales: SaleRow[]; range?: string }) {
    const handleExport = () => {
        const headers = ['N°', 'Date', 'Client', 'Total', 'Type', 'Statut'];
        const rows = sales.map(s => {
            // FIX: BUG 2 - Sanitize sale number
            const saleNumCsv = s.saleNumber?.startsWith('SALE-') 
                ? String(s.id).slice(0, 8) 
                : (s.saleNumber || String(s.id));
                
            return [
                saleNumCsv,
                s.date,
                `"${s.clientName.replace(/"/g, '""')}"`,
                safeNum(s.totalTTC).toFixed(2),
                s.isOfficialInvoice ? 'Officielle' : 'Hors-Bilan',
                s.status || '—',
            ].join(';');
        });
        
        // FIX: 2 - Use dynamic range for filename
        const filenameRange = range === 'today' ? format(new Date(), 'dd-MM-yyyy') : 
                              range === 'yesterday' ? format(new Date(Date.now() - 86400000), 'dd-MM-yyyy') : 
                              range === 'thisYear' ? format(new Date(), 'yyyy') : 
                              range === 'lastMonth' ? format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MM-yyyy') : 
                              range.includes('_') ? range : getMonthYear();
                              
        downloadCsv([headers.join(';'), ...rows].join('\n'), `toutes-ventes-${filenameRange}.csv`);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{sales.length} vente(s) au total</p>
                <Button onClick={handleExport} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exporter CSV Complet
                </Button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-medium">
                        <tr>
                            <th className="px-4 py-3 text-left border-b">N°</th>
                            <th className="px-4 py-3 text-left border-b">Date</th>
                            <th className="px-4 py-3 text-left border-b">Client</th>
                            <th className="px-4 py-3 text-right border-b">Total</th>
                            <th className="px-4 py-3 text-center border-b">Type</th>
                            <th className="px-4 py-3 text-center border-b">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-400">
                                    Aucune vente trouvée.
                                </td>
                            </tr>
                        ) : sales.map(s => {
                            const isPaid = safeNum(s.resteAPayer) <= 0.01;
                            
                            // FIX: BUG 2 - UI format
                            const displayNumber = /^\d{4}-\d{4,}$/.test(s.saleNumber ?? '')
                                ? s.saleNumber
                                : `#${String(s.id).slice(0, 8)}`;
                                
                            return (
                                <tr key={s.id} className="border-b hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-700">{displayNumber}</td>
                                    <td className="px-4 py-3 text-slate-600">{s.date}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">{s.clientName}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(safeNum(s.totalTTC))}</td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-[10px] font-bold uppercase flex w-fit mx-auto items-center gap-1',
                                                s.isOfficialInvoice
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    : 'bg-orange-100 text-orange-700 border-orange-200'
                                            )}
                                        >
                                            {s.isOfficialInvoice ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                            {s.isOfficialInvoice ? 'Officielle' : 'Hors-Bilan'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={s.status} isPaid={isPaid} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ExportsClient({ officialSales, horsbilanSales, allSales, dateRange }: ExportsClientProps) {
    return (
        <Card className="rounded-2xl shadow-sm border-slate-200">
            <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <LayoutGrid className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Exports Ventes</CardTitle>
                        <CardDescription>Données segmentées par type de facturation</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <Tabs defaultValue="comptabilite">
                    <TabsList className="mb-4 w-full sm:w-auto grid grid-cols-3 sm:flex">
                        <TabsTrigger value="comptabilite" className="gap-1.5 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Comptabilité ({officialSales.length})
                        </TabsTrigger>
                        <TabsTrigger value="hors-bilan" className="gap-1.5 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Hors-Bilan ({horsbilanSales.length})
                        </TabsTrigger>
                        <TabsTrigger value="toutes">
                            Toutes ({allSales.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="comptabilite">
                        {/* FIX: 2 - Passing dateRange down */}
                        <TabComptabilite sales={officialSales} range={dateRange} />
                    </TabsContent>
                    <TabsContent value="hors-bilan">
                        <TabHorsBilan sales={horsbilanSales} range={dateRange} />
                    </TabsContent>
                    <TabsContent value="toutes">
                        <TabToutes sales={allSales} range={dateRange} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
