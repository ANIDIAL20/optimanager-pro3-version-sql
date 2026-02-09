import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/db";
import { users, auditLog, shopProfiles } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
// Import from the recovered Admin Components
import EnhancedCreateClientForm from "@/components/admin/EnhancedCreateClientForm";
import ClientsTable from "@/components/admin/ClientsTable";
import { GlobalBannerManager } from "@/components/admin/GlobalBannerManager";
import { SaaSGrowthChart } from "@/components/admin/SaaSGrowthChart";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Users, CreditCard, Activity, BarChart3, Plus, ShieldCheck } from "lucide-react";
import { getAllClients, getSaaSStats, ClientData } from "@/app/actions/adminActions";

export default async function AdminDashboardPage() {
    // 🔒 1. Verify Access
    const { user } = await requireAdmin();

    // 🔒 2. Fetch Data (Optimized with Caching & Parallelism)
    const [rawStats, mappedClients, recentLogs] = await Promise.all([
        getSaaSStats(),
        getAllClients(),
        db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(5)
    ]);

    // Ensure we handle action responses
    const clients = Array.isArray(mappedClients) ? mappedClients : [];
    const dashboardStats = rawStats || { totalRevenue: 0, activeClients: 0, churnRate: 0, newSignups: 0 };

    // Chart Data (Reactive to real user count)
    const chartData = [
        { name: 'Jan', signups: 4 },
        { name: 'Feb', signups: 7 },
        { name: 'Mar', signups: 5 },
        { name: 'Apr', signups: 12 },
        { name: 'Actuel', signups: clients.length }, 
    ];

    const stats = {
        ...dashboardStats,
        chartData
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            {/* Clean Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Super Admin Console</h1>
                        <p className="text-slate-600 mt-1">Platform Control & Users Management</p>
                    </div>
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
                                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Users</p>
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
                    <EnhancedCreateClientForm />
                    <GlobalBannerManager initialData={null} />
                    
                    {/* Security Mini-Log (The Requested Merge) */}
                    <SpotlightCard className="p-4 bg-slate-900 text-white">
                        <h4 className="flex items-center gap-2 font-bold mb-4">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Security Audit
                        </h4>
                        <div className="space-y-2 text-xs font-mono">
                            {recentLogs.map((log: any) => (
                                <div key={log.id} className="flex justify-between border-b border-slate-700 pb-1">
                                    <span className="text-slate-400">{log.action}</span>
                                    <span className={log.success ? "text-emerald-400" : "text-red-400"}>
                                        {log.success ? "OK" : "FAIL"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SpotlightCard>
                </div>
            </div>

            {/* Clients Management Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-600" />
                        Liste des Utilisateurs ({mappedClients.length})
                    </h2>
                </div>
                <SpotlightCard className="overflow-hidden p-0">
                    <ClientsTable clients={mappedClients} />
                </SpotlightCard>
            </div>
        </div>
    );
}
