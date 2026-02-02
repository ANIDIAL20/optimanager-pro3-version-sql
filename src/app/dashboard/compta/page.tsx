'use client';

import * as React from 'react';
// TODO: Migrate accounting to SQL - fetch from sales-actions.ts
// import { useFirebase, useFirestore } from '@/firebase';
// import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, ShoppingCart, DollarSign, FileText, Users, Package, ArrowUpRight } from 'lucide-react';
import { format, startOfDay, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SensitiveData } from '@/components/ui/sensitive-data';

export default function AccountingPage() {
    // const { user } = useFirebase();
    // const firestore = useFirestore();

    const [dateRange, setDateRange] = React.useState('thisMonth');
    const [sales, setSales] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);

    // TODO: Replace with SQL queries from sales-actions.ts
    /* Firebase version
    const getStartDate = (range: string) => {
        const now = new Date();
        switch (range) {
            case 'today': return startOfDay(now);
            case 'thisMonth': return startOfMonth(now);
            case 'lastMonth': return startOfMonth(subMonths(now, 1));
            case 'thisYear': return startOfYear(now);
            default: return startOfMonth(now);
        }
    };

    React.useEffect(() => {
        const fetchData = async () => {
            if (!user || !firestore) return;
            setIsLoading(true);
            try {
                const startDate = getStartDate(dateRange);
                const salesRef = collection(firestore, `stores/${user.uid}/sales`);
                const q = query(
                    salesRef,
                    where('date', '>=', startDate.toISOString()),
                    orderBy('date', 'desc')
                );
                const snapshot = await getDocs(q);
                const salesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString() : doc.data().date,
                }));
                setSales(salesData);
            } catch (error) {
                console.error("Error fetching accounting data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user, firestore, dateRange]);
    */

    // KPI Calculations
    const totalRevenue = sales.reduce((acc, sale) => acc + (sale.totalTTC || 0), 0);
    const totalSalesCount = sales.length;
    const averageCart = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    // Chart Data Preparation
    const chartData = React.useMemo(() => {
        const dataMap = new Map();
        sales.forEach(sale => {
            const dateKey = format(new Date(sale.date), "dd/MM");
            const current = dataMap.get(dateKey) || 0;
            dataMap.set(dateKey, current + (sale.totalTTC || 0));
        });

        return Array.from(dataMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .reverse();
    }, [sales]);

    // Export Handler - Disabled pending SQL migration
    const handleExport = async (type: 'sales' | 'clients' | 'stock') => {
        toast({
            title: "Fonctionnalité désactivée",
            description: "Les exports sont temporairement indisponibles en attente de migration.",
        });
        return;
        
        /* Firebase version
        if (!user || !firestore) return;
        setIsExporting(true);
        try {
            let data: any[] = [];
            let headers: string[] = [];
            let filename = `${type}_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
            if (type === 'sales') {
                const allSalesSnap = await getDocs(collection(firestore, `stores/${user.uid}/sales`));
                data = allSalesSnap.docs.map(doc => {
                    const d = doc.data();
                    const dateValue = d.date?.toDate ? d.date.toDate() : new Date(d.date);
                    return {
                        ID: doc.id,
                        Date: format(dateValue, 'dd/MM/yyyy HH:mm'),
                        Client: d.clientName || 'Inconnu',
                        Total_TTC: d.totalTTC || 0,
                        Status: d.status || 'Validé'
                    };
                });
                headers = ['ID', 'Date', 'Client', 'Total_TTC', 'Status'];
            }
            else if (type === 'clients') {
                const clientsSnap = await getDocs(collection(firestore, `stores/${user.uid}/clients`));
                data = clientsSnap.docs.map(doc => {
                    const d = doc.data();
                    return {
                        Nom: d.nom,
                        Prenom: d.prenom,
                        Telephone: d.telephone1 || d.phone,
                        Email: d.email || ''
                    };
                });
                headers = ['Nom', 'Prenom', 'Telephone', 'Email'];
            }
            else if (type === 'stock') {
                const stockSnap = await getDocs(collection(firestore, `stores/${user.uid}/products`));
                data = stockSnap.docs.map(doc => {
                    const d = doc.data();
                    return {
                        Référence: d.reference,
                        Nom: d.nom,
                        Prix_Achat: d.prixAchat || 0,
                        Prix_Vente: d.prixVente || 0,
                        Stock: d.stock || 0
                    };
                });
                headers = ['Référence', 'Nom', 'Prix_Achat', 'Prix_Vente', 'Stock'];
            }
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(fieldName => `"${String(row[fieldName]).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setIsExporting(false);
        }
        */
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
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
                        <SelectItem value="thisMonth">Ce Mois</SelectItem>
                        <SelectItem value="lastMonth">Mois Dernier</SelectItem>
                        <SelectItem value="thisYear">Cette Année</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Cards - Sales Page Style */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Revenue Card */}
                <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Chiffre d'Affaires</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        ) : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    <SensitiveData value={totalRevenue} type="currency" />
                                </h3>
                                <div className="flex items-center gap-1 text-sm text-emerald-600">
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Sur la période</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>

                {/* Sales Card */}
                <SpotlightCard className="p-6" spotlightColor="rgba(139, 92, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Ventes Réalisées</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <ShoppingCart className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        ) : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    {totalSalesCount}
                                </h3>
                                <div className="flex items-center gap-1 text-sm text-purple-600">
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Total factures</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>

                {/* Average Cart Card */}
                <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Panier Moyen</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        ) : (
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    <SensitiveData value={averageCart} type="currency" />
                                </h3>
                                <div className="flex items-center gap-1 text-sm text-blue-600">
                                    <ArrowUpRight className="h-4 w-4" />
                                    <span className="font-medium">Moyenne par vente</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpotlightCard>
            </div>

            {/* Premium Chart Card */}
            <Card className="rounded-xl shadow-lg">
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
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={chartData}>
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
                                    formatter={(value: any) => [`${value} DH`, 'Chiffre d\'Affaires']}
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

            {/* Premium Export Cards Grid */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Exporter vos Données</h2>
                <p className="text-muted-foreground mb-6">Téléchargez vos données au format CSV pour une analyse approfondie.</p>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Sales Export Card */}
                    <Card
                        className="cursor-pointer p-6 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => handleExport('sales')}
                    >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                <FileText className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">Exporter Ventes</h3>
                                <p className="text-sm text-slate-600">Historique complet des ventes</p>
                            </div>
                            {isExporting ? (
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            ) : (
                                <div className="text-xs text-blue-600 font-medium">
                                    Cliquer pour télécharger
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Clients Export Card */}
                    <Card
                        className="cursor-pointer p-6 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => handleExport('clients')}
                    >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">Exporter Clients</h3>
                                <p className="text-sm text-slate-600">Base de données clients</p>
                            </div>
                            {isExporting ? (
                                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                            ) : (
                                <div className="text-xs text-emerald-600 font-medium">
                                    Cliquer pour télécharger
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Stock Export Card */}
                    <Card
                        className="cursor-pointer p-6 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => handleExport('stock')}
                    >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                                <Package className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">Exporter Stock</h3>
                                <p className="text-sm text-slate-600">État actuel de l'inventaire</p>
                            </div>
                            {isExporting ? (
                                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                            ) : (
                                <div className="text-xs text-violet-600 font-medium">
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
