'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, FileText, Users, Package, ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { useToast } from '@/hooks/use-toast';
import { getAccountingMetrics, exportSalesData, exportClientsData, exportStockData, type AccountingMetrics } from '@/app/actions/accounting-actions';
import { BrandLoader } from '@/components/ui/loader-brand';

// Constants
const CARD_COLORS = {
    revenue: {
        spotlight: "rgba(16, 185, 129, 0.15)",
        gradient: "from-emerald-500 to-teal-600",
        text: "text-emerald-600"
    },
    sales: {
        spotlight: "rgba(139, 92, 246, 0.15)",
        gradient: "from-purple-500 to-pink-600",
        text: "text-purple-600"
    },
    cart: {
        spotlight: "rgba(59, 130, 246, 0.15)",
        gradient: "from-blue-500 to-cyan-600",
        text: "text-blue-600"
    }
};

export default function AccountingPage() {
    const [dateRange, setDateRange] = React.useState('thisMonth');
    const { toast } = useToast();
    
    // Data State
    const [metrics, setMetrics] = React.useState<AccountingMetrics | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState<string | null>(null); // 'sales' | 'clients' | 'stock' | null

    // Fetch Data
    React.useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setIsLoading(true);
            try {
                const result = await getAccountingMetrics(dateRange);
                if (isMounted) {
                    if (result.success && result.data) {
                        setMetrics(result.data);
                    } else {
                        console.error("Failed to load metrics:", result.error);
                        toast({
                            variant: "destructive",
                            title: "Erreur",
                            description: "Impossible de charger les données comptables."
                        });
                    }
                }
            } catch (error) {
                console.error("Error loading metrics:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        loadData();

        return () => { isMounted = false; };
    }, [dateRange, toast]);


    // Export Handler
    const handleExport = async (type: 'sales' | 'clients' | 'stock') => {
        setIsExporting(type);
        try {
            let result;
            
            switch (type) {
                case 'sales':
                    result = await exportSalesData();
                    break;
                case 'clients':
                    result = await exportClientsData();
                    break;
                case 'stock':
                    result = await exportStockData();
                    break;
            }

            if (result && result.success && result.data) {
                // Create Blob and Download
                const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', result.filename || `${type}_export.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                toast({
                    title: "Export réussi",
                    description: `Le fichier ${type} a été téléchargé.`
                });
            } else {
                throw new Error(result?.error || "Erreur inconnue");
            }
            
        } catch (error: any) {
            console.error("Export failed:", error);
             toast({
                variant: "destructive",
                title: "Erreur d'export",
                description: error.message || "Une erreur est survenue lors de l'export."
            });
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Exports & Rapports</h1>
                    <p className="text-muted-foreground">Analysez vos performances et exportez vos données.</p>
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
                
                {/* Revenue */}
                <SpotlightCard className="p-6" spotlightColor={CARD_COLORS.revenue.spotlight}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Chiffre d'Affaires</p>
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${CARD_COLORS.revenue.gradient} flex items-center justify-center`}>
                                <DollarSign className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? (
                            <BrandLoader size="md" className="text-slate-400" />
                        ) : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    <SensitiveData value={metrics?.totalRevenue || 0} type="currency" />
                                </h3>
                                <div className={`flex items-center gap-1 text-sm ${CARD_COLORS.revenue.text}`}>
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Sur la période</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>

                {/* Sales Count */}
                <SpotlightCard className="p-6" spotlightColor={CARD_COLORS.sales.spotlight}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Ventes Réalisées</p>
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${CARD_COLORS.sales.gradient} flex items-center justify-center`}>
                                <ShoppingCart className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? (
                            <BrandLoader size="md" className="text-slate-400" />
                        ) : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    {metrics?.salesCount || 0}
                                </h3>
                                <div className={`flex items-center gap-1 text-sm ${CARD_COLORS.sales.text}`}>
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Total factures</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>

                {/* Average Cart */}
                <SpotlightCard className="p-6" spotlightColor={CARD_COLORS.cart.spotlight}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Panier Moyen</p>
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${CARD_COLORS.cart.gradient} flex items-center justify-center`}>
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? (
                            <BrandLoader size="md" className="text-slate-400" />
                        ) : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    <SensitiveData value={metrics?.averageCart || 0} type="currency" />
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
                            <AreaChart data={metrics?.chartData || []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}DH`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                    formatter={(value: any) => [`${Number(value).toFixed(2)} DH`, 'Chiffre d\'Affaires']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Exports Section */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Exporter vos Données</h2>
                <p className="text-muted-foreground mb-6">Téléchargez vos données au format CSV pour une analyse approfondie.</p>

                <div className="grid gap-6 md:grid-cols-3">
                    
                    {/* Sales Export */}
                    <Card
                        className="cursor-pointer p-6 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group"
                        onClick={() => !isExporting && handleExport('sales')}
                    >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <FileText className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">Exporter Ventes</h3>
                                <p className="text-sm text-slate-600">Historique complet des ventes</p>
                            </div>
                            {isExporting === 'sales' ? (
                                <BrandLoader size="sm" className="text-blue-500" />
                            ) : (
                                <div className="text-xs text-blue-600 font-medium group-hover:underline">
                                    Cliquer pour télécharger
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Clients Export */}
                    <Card
                        className="cursor-pointer p-6 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group"
                        onClick={() => !isExporting && handleExport('clients')}
                    >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">Exporter Clients</h3>
                                <p className="text-sm text-slate-600">Base de données clients</p>
                            </div>
                            {isExporting === 'clients' ? (
                                <BrandLoader size="sm" className="text-emerald-500" />
                            ) : (
                                <div className="text-xs text-emerald-600 font-medium group-hover:underline">
                                    Cliquer pour télécharger
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Stock Export */}
                    <Card
                        className="cursor-pointer p-6 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group"
                        onClick={() => !isExporting && handleExport('stock')}
                    >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <Package className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">Exporter Stock</h3>
                                <p className="text-sm text-slate-600">État actuel de l'inventaire</p>
                            </div>
                            {isExporting === 'stock' ? (
                                <BrandLoader size="sm" className="text-violet-500" />
                            ) : (
                                <div className="text-xs text-violet-600 font-medium group-hover:underline">
                                    Cliquer pour télécharger
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
