'use client';

import * as React from 'react';
import Link from 'next/link';
import { getDashboardStats } from '@/app/actions/dashboard-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/lib/auth-helpers';
import {
    TrendingUp,
    ShoppingCart,
    AlertTriangle,
    Users,
    Package,
    ArrowRight,
    FileText,
    Bell,
    ArrowUpRight,
    ShoppingBag,
    Database,
    Truck,
    Briefcase
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface DashboardData {
    globalRevenue: number;
    todaySalesCount: number;
    totalSalesCount: number;
    stockAlerts: number;
    stockAlertItems: Array<{
        id: string;
        nom: string;
        reference: string;
        quantite: number;
    }>;
    recentActivity: Array<{
        id: string;
        type: 'sale' | 'devis';
        description: string;
        amount: number;
        date: string;
        status: string;
        resteAPayer?: number;
    }>;
}

interface UsageStats {
    products: { count: number, limit: number };
    clients: { count: number, limit: number };
    suppliers: { count: number, limit: number };
}

interface DashboardClientProps {
    user: AuthUser;
    usage: UsageStats;
}

const formatLimit = (limit: number) => {
    if (limit >= 10000) return "IllimitÃ©";
    return limit;
};

export default function DashboardClient({ user, usage }: DashboardClientProps) {
    const [data, setData] = React.useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            try {
                const result = await getDashboardStats();
                if (result.success && result.data) {
                    setData(result.data);
                }
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const revenueGrowth = 12.5; // Mock percentage

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Tableau de Bord
                </h1>
                <p className="text-muted-foreground mt-1">
                    Vue d'ensemble de votre boutique
                </p>
            </div>

            {/* Top Row: Revenue (2 cols) + Ventes (1 col) + Action Card (1 col) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Chiffre d'Affaires - Large Card (2 cols) -> Linked to Ventes */}
                <Link href="/dashboard/ventes" className="lg:col-span-2 block group">
                    <SpotlightCard className="h-full p-6 cursor-pointer" spotlightColor="rgba(16, 185, 129, 0.2)">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Chiffre d'Affaires Global
                                </p>
                                <h2 className="text-4xl font-bold tracking-tight text-foreground group-hover:text-emerald-700 transition-colors">
                                    <SensitiveData value={data?.globalRevenue || 0} type="currency" currency="DH" />
                                </h2>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                                <TrendingUp className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
                                <ShoppingBag className="h-3 w-3 mr-1" />
                                {data?.totalSalesCount || 0} Ventes Totales
                            </Badge>
                        </div>
                    </SpotlightCard>
                </Link>

                {/* Ventes du Jour - Small Card (1 col) -> Linked to Ventes */}
                <Link href="/dashboard/ventes" className="block group">
                    <SpotlightCard className="h-full p-6 cursor-pointer" spotlightColor="rgba(59, 130, 246, 0.2)">
                        <div className="flex items-start justify-between mb-4">
                            <p className="text-sm font-medium text-muted-foreground">
                                Ventes du Jour
                            </p>
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
                                <ShoppingCart className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight text-foreground group-hover:text-blue-700 transition-colors">
                            {data?.todaySalesCount || 0}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Commandes aujourd'hui
                        </p>
                    </SpotlightCard>
                </Link>

                {/* Nouvelle Commande - Gradient Action Card (1 col) -> Linked to New Order */}
                <Link
                    href="/dashboard/ventes/new"
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25 cursor-pointer flex flex-col items-center justify-center text-center h-full"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <ShoppingBag className="h-7 w-7 text-white" />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">Nouvelle Vente</h3>

                    <div className="flex items-center gap-2 text-sm text-blue-100 font-medium group-hover:text-white transition-colors">
                        <span>Commencer</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                </Link>
            </div>

            {/* Middle Row: Stock + Recent Sales + Quick Access */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Stock Critique -> Linked to Produits */}
                <SpotlightCard className="h-full p-6" spotlightColor="rgba(239, 68, 68, 0.15)">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <h3 className="text-sm font-bold text-foreground border-b border-transparent">
                                Stock Critique / Rupture
                            </h3>
                        </div>
                        {data && data.stockAlerts > 0 && (
                            <Link href="/produits" className="h-6 min-w-[24px] px-1.5 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer text-decoration-none">
                                <span className="text-xs font-bold text-white">{data.stockAlerts}</span>
                            </Link>
                        )}
                    </div>

                    {!data || data.stockAlertItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-emerald-700">Stock sain</p>
                            <p className="text-xs text-slate-500">Aucun produit en rupture</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.stockAlertItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/produits/${item.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-all group/item"
                                >
                                    <div className="flex-1 min-w-0 pr-3">
                                        <p className="text-sm font-medium text-slate-900 truncate group-hover/item:text-red-700 transition-colors">
                                            {item.nom}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                                            RÃ©f: {item.reference}
                                        </p>
                                    </div>
                                    <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                        <span className="text-sm font-bold text-white">{item.quantite}</span>
                                    </div>
                                </Link>
                            ))}
                            {data.stockAlerts > 5 && (
                                <Link href="/produits" className="block text-center text-xs text-slate-500 hover:text-red-600 font-medium pt-2 transition-colors">
                                    Voir tout...
                                </Link>
                            )}
                        </div>
                    )}
                </SpotlightCard>

                {/* DerniÃ¨res Ventes (2 cols) */}
                <SpotlightCard className="lg:col-span-2 p-6" spotlightColor="rgba(99, 102, 241, 0.1)">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <ShoppingBag className="h-4 w-4 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                                DerniÃ¨res Ventes
                            </h3>
                        </div>
                        <Link
                            href="/dashboard/ventes"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Voir tout
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {!data || data.recentActivity.length === 0 ? (
                        <div className="py-12 text-center">
                            <ShoppingBag className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                            <p className="text-sm text-slate-400">Aucune vente rÃ©cente</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.recentActivity.map((activity) => (
                                <Link
                                    key={activity.id}
                                    href={`/dashboard/ventes/${activity.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                            <ShoppingCart className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                {activity.description}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(activity.date).toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-md">
                                            <SensitiveData value={activity.amount} type="currency" currency="DH" />
                                        </span>
                                        <Badge
                                            variant={activity.status === 'PayÃ©' ? 'default' : 'destructive'}
                                            className={cn(
                                                "text-[10px] px-2 py-0.5 shadow-none",
                                                activity.status === 'PayÃ©'
                                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                                                    : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                                            )}
                                        >
                                            {activity.status}
                                        </Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </SpotlightCard>

                {/* AccÃ¨s Rapide / Shortcuts */}
                <SpotlightCard className="p-6" spotlightColor="rgba(168, 85, 247, 0.15)">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Bell className="h-4 w-4 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            AccÃ¨s Rapide
                        </h3>
                    </div>

                    <div className="space-y-3">
                        <Link
                            href="/dashboard/clients"
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-purple-50 hover:border-purple-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="h-4 w-4 text-purple-700" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-purple-700 transition-colors">Clients</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                        </Link>

                        <Link
                            href="/produits"
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Package className="h-4 w-4 text-blue-700" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">Stock</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </Link>

                        <Link
                            href="/dashboard/devis"
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText className="h-4 w-4 text-emerald-700" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">Devis</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>
                </SpotlightCard>
            </div>

            {/* Quotas & Limits Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Products Quota */}
                 <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.1)">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Produits</span>
                        </div>
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {usage.products.count} / {formatLimit(usage.products.limit)}
                        </span>
                    </div>
                    <Progress value={(usage.products.count / usage.products.limit) * 100} className="h-2 mb-2" />
                    <p className="text-xs text-slate-400 text-right">
                        {Math.round((usage.products.count / usage.products.limit) * 100)}% utilisÃ©
                    </p>
                 </SpotlightCard>

                 {/* Clients Quota */}
                 <SpotlightCard className="p-6" spotlightColor="rgba(168, 85, 247, 0.1)">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Clients</span>
                        </div>
                        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {usage.clients.count} / {formatLimit(usage.clients.limit)}
                        </span>
                    </div>
                    <Progress value={(usage.clients.count / usage.clients.limit) * 100} className="h-2 mb-2" />
                     <p className="text-xs text-slate-400 text-right">
                        {Math.round((usage.clients.count / usage.clients.limit) * 100)}% utilisÃ©
                    </p>
                 </SpotlightCard>

                 {/* Suppliers Quota */}
                 <SpotlightCard className="p-6" spotlightColor="rgba(234, 179, 8, 0.1)">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-lg bg-yellow-50 flex items-center justify-center">
                                <Truck className="h-4 w-4 text-yellow-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Fournisseurs</span>
                        </div>
                        <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            {usage.suppliers.count} / {formatLimit(usage.suppliers.limit)}
                        </span>
                    </div>
                    <Progress value={(usage.suppliers.count / usage.suppliers.limit) * 100} className="h-2 mb-2" />
                     <p className="text-xs text-slate-400 text-right">
                        {Math.round((usage.suppliers.count / usage.suppliers.limit) * 100)}% utilisÃ©
                    </p>
                 </SpotlightCard>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50/50 p-6 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2 bg-card rounded-xl p-6 border shadow-sm">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="bg-card rounded-xl p-6 border shadow-sm">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-full rounded-xl" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-8 w-16" />
                </div>
                <div className="lg:col-span-2 bg-card rounded-xl p-6 border shadow-sm">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </div>
            </div>
        </div>
    );
}
