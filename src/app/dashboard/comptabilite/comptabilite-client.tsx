'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, TrendingUp, Briefcase, CalendarDays, CheckCircle2 } from 'lucide-react';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfMonth, subMonths, isWithinInterval, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SpotlightCard } from '@/components/ui/spotlight-card';

// Safe number parser
const safeNum = (val: any) => typeof val === 'number' ? val : parseFloat(val) || 0;

export function ComptabiliteClient({ initialSales }: { initialSales: any[] }) {
    const [period, setPeriod] = React.useState('this_month');

    // 1. Determine date range
    const getFilterDates = () => {
        const now = new Date();
        switch (period) {
            case 'this_week': return { start: subDays(now, 7), end: now };
            case 'this_month': return { start: startOfMonth(now), end: now };
            case 'last_month': return { start: startOfMonth(subMonths(now, 1)), end: startOfMonth(now) };
            case 'this_year': return { start: startOfYear(now), end: now };
            default: return { start: new Date(2000, 1, 1), end: now }; // "all"
        }
    };

    const { start, end } = getFilterDates();

    // 2. Filter sales base dataset
    const filteredSales = React.useMemo(() => {
        return initialSales.filter(s => {
            if (!s.date && !s.createdAt) return false;
            const d = new Date(s.date || s.createdAt);
            if (period === 'all') return true;
            return isWithinInterval(d, { start, end });
        });
    }, [initialSales, period, start, end]);

    // 3. Compute KPIs
    const kpis = React.useMemo(() => {
        let officialCA = 0;
        let horsBilanCA = 0;
        
        filteredSales.forEach(s => {
            const amount = safeNum(s.totalNet);
            if (s.isOfficialInvoice) {
                officialCA += amount;
            } else {
                horsBilanCA += amount;
            }
        });

        // HT = TTC / 1.20; TVA = TTC - HT
        const officialHT = officialCA / 1.20;
        const officialTVA = officialCA - officialHT;

        return { officialCA, horsBilanCA, officialTVA, officialHT };
    }, [filteredSales]);

    // 4. Monthly summary 
    const monthlySummary = React.useMemo(() => {
        const summary: Record<string, { ttc: number, ht: number, tva: number }> = {};
        
        initialSales.filter(s => s.isOfficialInvoice).forEach(s => {
            const d = new Date(s.date || s.createdAt);
            const monthKey = format(d, 'yyyy-MM', { locale: fr });
            const amount = safeNum(s.totalNet);
            
            if (!summary[monthKey]) summary[monthKey] = { ttc: 0, ht: 0, tva: 0 };
            
            summary[monthKey].ttc += amount;
            summary[monthKey].ht += amount / 1.20;
            summary[monthKey].tva += amount - (amount / 1.20);
        });

        // Convert and sort latest first
        return Object.entries(summary)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => b.month.localeCompare(a.month));
    }, [initialSales]);

    // 5. Official Sales
    const officialSales = React.useMemo(() => {
        return filteredSales.filter(s => s.isOfficialInvoice);
    }, [filteredSales]);


    // CSV Export logic
    const handleExportCSV = () => {
        const rows = [
            ['NumFacture', 'Date', 'Client', 'HT (MAD)', 'TVA 20% (MAD)', 'TTC (MAD)', 'ModeReglement']
        ];

        officialSales.forEach(s => {
            const d = new Date(s.date || s.createdAt);
            const dateStr = format(d, 'dd/MM/yyyy', { locale: fr });
            const clientName = `${s.clientPrenom} ${s.clientNom}`.trim();
            const ttc = safeNum(s.totalNet);
            const ht = ttc / 1.20;
            const tva = ttc - ht;
            
            rows.push([
                s.saleNumber || s.id.toString(),
                dateStr,
                `"${clientName}"`,
                ht.toFixed(2),
                tva.toFixed(2),
                ttc.toFixed(2),
                s.paymentMethod || 'Non spécifié'
            ]);
        });

        const csvContent = rows.map(e => e.join(";")).join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const monthStr = format(start, 'MM-yyyy');
        link.setAttribute("href", url);
        link.setAttribute("download", `export-comptable-${period === 'all' ? 'complet' : monthStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                        <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Comptabilité</h1>
                        <p className="text-slate-500 mt-1">Gérez et exportez vos données financières officielles.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <CalendarDays className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this_week">7 derniers jours</SelectItem>
                            <SelectItem value="this_month">Mois en cours</SelectItem>
                            <SelectItem value="last_month">Mois précédent</SelectItem>
                            <SelectItem value="this_year">Cette année</SelectItem>
                            <SelectItem value="all">Tout l'historique</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button onClick={handleExportCSV} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">CA Officiel TTC (Déclarable)</p>
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">
                            <SensitiveData value={kpis.officialCA} type="currency" />
                        </h3>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor="rgba(249, 115, 22, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">CA Hors-Bilan (Non Déclarable)</p>
                            <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Briefcase className="h-4 w-4 text-orange-600" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">
                            <SensitiveData value={kpis.horsBilanCA} type="currency" />
                        </h3>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">TVA Collectée (À reverser)</p>
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">
                            <SensitiveData value={kpis.officialTVA} type="currency" />
                        </h3>
                    </div>
                </SpotlightCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Tableau Officiel */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Ventes Officielles ({officialSales.length})</CardTitle>
                        <CardDescription>Registre des ventes pour la période sélectionnée.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 border-t">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3 border-b"># Vente</th>
                                        <th className="px-4 py-3 border-b">Date</th>
                                        <th className="px-4 py-3 border-b">Client</th>
                                        <th className="px-4 py-3 border-b text-right">HT</th>
                                        <th className="px-4 py-3 border-b text-right">TVA 20%</th>
                                        <th className="px-4 py-3 border-b text-right">TTC</th>
                                        <th className="px-4 py-3 border-b text-center">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {officialSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-6 text-slate-500">Aucune vente officielle sur cette période.</td>
                                        </tr>
                                    ) : officialSales.map(sale => {
                                        const ttc = safeNum(sale.totalNet);
                                        const ht = ttc / 1.20;
                                        const tva = ttc - ht;
                                        const isPaid = safeNum(sale.resteAPayer) <= 0.01;
                                        
                                        return (
                                            <tr key={sale.id} className="border-b hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-mono text-slate-900">#{sale.id.slice(0, 6)}</td>
                                                <td className="px-4 py-3 text-slate-600">{format(new Date(sale.date || sale.createdAt), 'dd/MM/yyyy', { locale: fr })}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[150px]">{sale.clientPrenom} {sale.clientNom}</td>
                                                <td className="px-4 py-3 text-right"><SensitiveData value={ht} type="currency" /></td>
                                                <td className="px-4 py-3 text-right text-slate-500"><SensitiveData value={tva} type="currency" /></td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900"><SensitiveData value={ttc} type="currency" /></td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="outline" className={isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"}>
                                                        {isPaid ? 'Payé' : 'Impayé'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Résumé mensuel */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bilan Mensuel TVA</CardTitle>
                        <CardDescription>Tous les mois d'activité (Officiel).</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 border-t">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Mois</th>
                                        <th className="px-4 py-3 border-b text-right">HT</th>
                                        <th className="px-4 py-3 border-b text-right font-bold">TVA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlySummary.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="text-center py-6 text-slate-500">Aucune donnée</td>
                                        </tr>
                                    ) : monthlySummary.map((data) => {
                                        // Parse '2026-02' => 'Fév 2026'
                                        const [y, m] = data.month.split('-');
                                        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                                        const monthLabel = format(d, 'MMM yyyy', { locale: fr });
                                        
                                        return (
                                            <tr key={data.month} className="border-b hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium capitalize text-slate-900">{monthLabel}</td>
                                                <td className="px-4 py-3 text-right text-slate-600"><SensitiveData value={data.ht} type="currency" currency="" /></td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-700"><SensitiveData value={data.tva} type="currency" currency="" /></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
