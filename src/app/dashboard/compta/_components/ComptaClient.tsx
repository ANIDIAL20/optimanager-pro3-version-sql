'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, FileText, Users, Package, ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { useToast } from '@/hooks/use-toast';
import {
    getAccountingMetrics,
    exportSalesData,
    exportClientsData,
    exportStockData,
} from '@/app/actions/accounting-actions';
import { BrandLoader } from '@/components/ui/loader-brand';
import type { AccountingMetrics } from '@/types/accounting';

const CARD_COLORS = {
    revenue: {
        spotlight: 'rgba(16, 185, 129, 0.15)',
        gradient: 'from-emerald-500 to-teal-600',
        text: 'text-emerald-600',
    },
    sales: {
        spotlight: 'rgba(139, 92, 246, 0.15)',
        gradient: 'from-purple-500 to-pink-600',
        text: 'text-purple-600',
    },
    cart: {
        spotlight: 'rgba(59, 130, 246, 0.15)',
        gradient: 'from-blue-500 to-cyan-600',
        text: 'text-blue-600',
    },
};

interface ComptaClientProps {
    initialMetrics: AccountingMetrics | null;
    externalRange?: string;
    onRangeChange?: (range: string) => void;
}

export function ComptaClient({ initialMetrics, externalRange, onRangeChange }: ComptaClientProps) {
    const [internalRange, setInternalRange] = React.useState('thisMonth');
    const dateRange = externalRange || internalRange;
    const setDateRange = onRangeChange || setInternalRange;

    const { toast } = useToast();

    const [metrics, setMetrics] = React.useState<AccountingMetrics | null>(initialMetrics);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState<string | null>(null);

    // Reload KPIs + chart when date range changes (skip on initial mount)
    const isFirstRender = React.useRef(true);
    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        let alive = true;
        setIsLoading(true);

        getAccountingMetrics(dateRange)
            .then(result => {
                if (!alive) return;
                if (result.success && result.data) {
                    setMetrics(result.data);
                } else {
                    toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les métriques.' });
                }
            })
            .catch(console.error)
            .finally(() => { if (alive) setIsLoading(false); });

        return () => { alive = false; };
    }, [dateRange, toast]);

    const handleExport = async (type: 'sales' | 'clients' | 'stock') => {
        setIsExporting(type);
        try {
            let result: { success: boolean; data?: string; filename?: string; error?: string } | undefined;

            if (type === 'sales') result = await (exportSalesData as () => Promise<{ success: boolean; data?: string; filename?: string; error?: string }>)();
            else if (type === 'clients') result = await (exportClientsData as () => Promise<{ success: boolean; data?: string; filename?: string; error?: string }>)();
            else result = await (exportStockData as () => Promise<{ success: boolean; data?: string; filename?: string; error?: string }>)();

            if (result?.success && result.data) {
                const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', result.filename ?? `${type}_export.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast({ title: 'Export réussi', description: `Le fichier ${type} a été téléchargé.` });
            } else {
                throw new Error(result?.error ?? 'Erreur inconnue');
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erreur inattendue';
            toast({ variant: 'destructive', title: "Erreur d'export", description: msg });
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Exports &amp; Rapports</h1>
                        <p className="text-slate-500 mt-1">Analysez vos performances et exportez vos données.</p>
                    </div>
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Aujourd'hui</SelectItem>
                        <SelectItem value="yesterday">Hier</SelectItem>
                        <SelectItem value="thisMonth">Ce Mois</SelectItem>
                        <SelectItem value="lastMonth">Mois Dernier</SelectItem>
                        <SelectItem value="thisYear">Cette Année</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <SpotlightCard className="p-6" spotlightColor={CARD_COLORS.revenue.spotlight}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Chiffre d'Affaires</p>
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${CARD_COLORS.revenue.gradient} flex items-center justify-center`}>
                                <DollarSign className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? <BrandLoader size="md" className="text-slate-400" /> : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    <SensitiveData value={metrics?.totalRevenue ?? 0} type="currency" />
                                </h3>
                                <div className={`flex items-center gap-1 text-sm ${CARD_COLORS.revenue.text}`}>
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Sur la période</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor={CARD_COLORS.sales.spotlight}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Ventes Réalisées</p>
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${CARD_COLORS.sales.gradient} flex items-center justify-center`}>
                                <ShoppingCart className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? <BrandLoader size="md" className="text-slate-400" /> : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">{metrics?.salesCount ?? 0}</h3>
                                <div className={`flex items-center gap-1 text-sm ${CARD_COLORS.sales.text}`}>
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Total factures</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor={CARD_COLORS.cart.spotlight}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Panier Moyen</p>
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${CARD_COLORS.cart.gradient} flex items-center justify-center`}>
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? <BrandLoader size="md" className="text-slate-400" /> : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    <SensitiveData value={metrics?.averageCart ?? 0} type="currency" />
                                </h3>
                                <div className={`flex items-center gap-1 text-sm ${CARD_COLORS.cart.text}`}>
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Moyenne par vente</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>
            </div>

            {/* Chart */}
            <Card className="rounded-xl shadow-lg border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Évolution du Chiffre d'Affaires
                    </CardTitle>
                    <CardDescription>Tendance des ventes sur la période sélectionnée</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    {isLoading ? (
                        <div className="h-[350px] flex items-center justify-center">
                            <BrandLoader size="md" className="text-primary" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={metrics?.chartData ?? []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                {/* FIX: 3 - Set domain to start from 0 */}
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v}DH`} domain={[0, 'auto']} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px',
                                    }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                    formatter={(value: number) => [`${value.toFixed(2)} DH`, "Chiffre d'Affaires"]}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Legacy Exports */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Exporter vos Données</h2>
                <p className="text-muted-foreground mb-6">Téléchargez vos données au format CSV pour une analyse approfondie.</p>
                <div className="grid gap-6 md:grid-cols-3">
                    {([
                        { type: 'sales' as const, label: 'Exporter Ventes', sub: 'Historique complet des ventes', gradient: 'from-blue-500 to-indigo-600', icon: <FileText className="h-8 w-8 text-white" />, color: 'text-blue-600' },
                        { type: 'clients' as const, label: 'Exporter Clients', sub: 'Base de données clients', gradient: 'from-emerald-500 to-teal-600', icon: <Users className="h-8 w-8 text-white" />, color: 'text-emerald-600' },
                        { type: 'stock' as const, label: 'Exporter Stock', sub: "État actuel de l'inventaire", gradient: 'from-violet-500 to-purple-600', icon: <Package className="h-8 w-8 text-white" />, color: 'text-violet-600' },
                    ] as const).map(item => (
                        <Card
                            key={item.type}
                            className="cursor-pointer p-6 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group"
                            onClick={() => !isExporting && handleExport(item.type)}
                        >
                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                <div className={`h-16 w-16 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-1">{item.label}</h3>
                                    <p className="text-sm text-slate-600">{item.sub}</p>
                                </div>
                                {isExporting === item.type ? (
                                    <BrandLoader size="sm" className={item.color} />
                                ) : (
                                    <div className={`text-xs ${item.color} font-medium group-hover:underline`}>
                                        Cliquer pour télécharger
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
