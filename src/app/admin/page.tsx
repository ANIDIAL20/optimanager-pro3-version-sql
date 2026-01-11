import { verifySuperAdmin } from "@/lib/admin-utils";
import { getAllClients, getSaaSStats, getGlobalBanner } from "@/app/actions/adminActions";
import CreateClientForm from "@/components/admin/CreateClientForm";
import ClientsTable from "@/components/admin/ClientsTable";
import { GlobalBannerManager } from "@/components/admin/GlobalBannerManager";
import { SaaSGrowthChart } from "@/components/admin/SaaSGrowthChart";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Users, CreditCard, Activity, BarChart3, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    // 1. Verify Access (Handled by Layout)
    // await verifySuperAdmin(); 

    // 2. Fetch Data
    const [stats, clients, banner] = await Promise.all([
        getSaaSStats(),
        getAllClients(),
        getGlobalBanner()
    ]);

    return (
        <div className="space-y-6">
            {/* Clean Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Super Admin Console</h1>
                        <p className="text-slate-600 mt-1">Contrôle SaaS & Gestion Clients</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Potentially other top-level actions */}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Stats Grid - Spotlight Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">MRR</p>
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                        <CreditCard className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.totalRevenue} MAD</h3>
                                </div>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Clients</p>
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.activeClients}</h3>
                                </div>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard className="p-6" spotlightColor={stats.churnRate > 10 ? "rgba(239, 68, 68, 0.15)" : "rgba(249, 115, 22, 0.15)"}>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Attrition</p>
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stats.churnRate > 10 ? 'bg-gradient-to-br from-red-500 to-pink-600' : 'bg-gradient-to-br from-orange-500 to-amber-600'}`}>
                                        <Activity className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className={`text-2xl font-bold ${stats.churnRate > 10 ? 'text-red-600' : 'text-orange-600'}`}>
                                        {stats.churnRate}%
                                    </h3>
                                </div>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard className="p-6" spotlightColor="rgba(139, 92, 246, 0.15)">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Nouveaux</p>
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                                        <BarChart3 className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-slate-900">+{stats.newSignups}</h3>
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>

                    {/* Growth Chart */}
                    <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                        <SaaSGrowthChart data={stats.chartData} />
                    </SpotlightCard>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <CreateClientForm />
                    <GlobalBannerManager initialData={banner} />
                </div>
            </div>

            {/* Clients Management Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-600" />
                        Liste des Clients ({clients.length})
                    </h2>
                </div>
                <SpotlightCard className="overflow-hidden p-0">
                    <ClientsTable clients={clients} />
                </SpotlightCard>
            </div>
        </div>
    );
}
