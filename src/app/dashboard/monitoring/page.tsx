/**
 * Monitoring Dashboard
 * Visualizes system health, performance, and trends.
 */

import { requireUser, requireAdmin } from '@/lib/auth';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { sql, and, gte, desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Clock, Server } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MonitoringCharts } from './_components/monitoring-charts';
import { getMetricsForLastWeek } from '@/lib/metrics';

export default async function MonitoringPage() {
    // 1. Authenticate (Admin only)
    const user = await requireAdmin();

    // 2. Data Fetching
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastWeekMetrics = await getMetricsForLastWeek();

    // Today's Aggregate Stats
    const statsResult = await db.select({
        total: sql<number>`count(*)`,
        failures: sql<number>`count(*) FILTER (WHERE ${auditLogs.metadata}->>'errorMessage' IS NOT NULL OR ${auditLogs.action} = 'error')`,
        avgDuration: sql<number>`avg(CAST(${auditLogs.metadata}->>'duration' AS INTEGER))`,
    })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, today));

    const stats = statsResult[0] || { total: 0, failures: 0, avgDuration: 0 };

    // Slowest Queries Today
    const slowQueries = await db.select()
        .from(auditLogs)
        .where(and(
            gte(auditLogs.createdAt, today),
            sql`CAST(${auditLogs.metadata}->>'duration' AS INTEGER) > 500`
        ))
        .orderBy(sql`CAST(${auditLogs.metadata}->>'duration' AS INTEGER) DESC`)
        .limit(15);

    // Recent Failures
    const recentFailures = await db.select()
        .from(auditLogs)
        .where(and(
            gte(auditLogs.createdAt, today),
            sql`${auditLogs.metadata}->>'errorMessage' IS NOT NULL`
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10);

    const errorRate = stats.total > 0 ? (Number(stats.failures) / Number(stats.total)) * 100 : 0;

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">Tableau de Bord Monitoring</h1>
                    <p className="text-muted-foreground mt-2 italic">Performance et santé du système en temps réel</p>
                </div>
                <Badge variant={healthy(errorRate) ? "secondary" : "destructive"} className="px-4 py-1 text-sm">
                    {healthy(errorRate) ? "SANTÉ: OPTIMALE" : "ALERTE: DÉGRADÉ"}
                </Badge>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard 
                    title="Transactions Aujourd'hui" 
                    value={stats.total.toString()} 
                    icon={<Activity className="w-5 h-5 text-blue-500" />}
                />
                <StatCard 
                    title="Transactions Échouées" 
                    value={stats.failures.toString()} 
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                    color={Number(stats.failures) > 0 ? "text-red-500" : ""}
                />
                <StatCard 
                    title="Taux d'Erreur" 
                    value={`${errorRate.toFixed(2)}%`} 
                    icon={<Server className="w-5 h-5 text-orange-500" />}
                    color={errorRate > 5 ? "text-red-600 font-bold" : ""}
                />
                <StatCard 
                    title="Réponse Moyenne" 
                    value={`${Math.round(stats.avgDuration || 0)}ms`} 
                    icon={<Clock className="w-5 h-5 text-green-500" />}
                />
            </div>

            {/* 🆕 Weekly Charts */}
            <MonitoringCharts data={lastWeekMetrics} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Slow Queries Table */}
                <Card className="shadow-lg border-2 border-slate-100">
                    <CardHeader className="bg-slate-50/50">
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-500" />
                            Requêtes Lentes (Threshold 500ms)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entité</TableHead>
                                    <TableHead className="text-right">Durée</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {slowQueries.length > 0 ? slowQueries.map((q: any) => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium">{q.action}</TableCell>
                                        <TableCell>{q.entityType}</TableCell>
                                        <TableCell className="text-right text-orange-600 font-bold">
                                            {(q.metadata as any)?.duration}ms
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                                            Aucune requête lente détectée aujourd'hui
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Failures */}
                <Card className="shadow-lg border-2 border-red-50">
                    <CardHeader className="bg-red-50/30">
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Échecs Récents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {recentFailures.length > 0 ? recentFailures.map((f: any) => (
                                <div key={f.id} className="p-3 bg-red-50/50 rounded-lg border border-red-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-red-700 text-sm italic">[{f.action}] {f.entityType}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(f.createdAt, 'HH:mm', { locale: fr })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-red-600 line-clamp-2">
                                        {(f.metadata as any)?.errorMessage || 'Erreur inconnue'}
                                    </p>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-muted-foreground italic">
                                    Aucun échec aujourd'hui. Félicitations !
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color = "" }: { title: string, value: string, icon: React.ReactNode, color?: string }) {
    return (
        <Card className="shadow-md hover:shadow-lg transition-shadow border-none bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={cn("text-3xl font-black mt-1", color)}>{value}</div>
            </CardContent>
        </Card>
    );
}

function healthy(errorRate: number): boolean {
    return errorRate < 5;
}
