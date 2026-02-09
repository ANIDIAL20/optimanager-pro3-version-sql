'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MonitoringChartsProps {
    data: any[];
}

export function MonitoringCharts({ data }: MonitoringChartsProps) {
    const chartConfig = {
        totalTransactions: { label: "Transactions", color: "hsl(var(--primary))" },
        failedTransactions: { label: "Échecs", color: "hsl(var(--destructive))" },
        avgResponseTime: { label: "Temps de réponse (ms)", color: "hsl(var(--chart-2))" }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Transaction Volume Chart */}
            <Card className="shadow-lg border-2 border-slate-100">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Volume des Transactions (7 Jours)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ChartContainer config={chartConfig}>
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: fr })}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="totalTransactions" 
                                    stroke="hsl(var(--primary))" 
                                    fillOpacity={1} 
                                    fill="url(#colorTotal)" 
                                    strokeWidth={2}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="failedTransactions" 
                                    stroke="hsl(var(--destructive))" 
                                    fill="transparent"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Response Time Chart */}
            <Card className="shadow-lg border-2 border-slate-100">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Temps de Réponse Moyen (ms)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ChartContainer config={chartConfig}>
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: fr })}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="ms" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line 
                                    type="step" 
                                    dataKey="avgResponseTime" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#10b981" }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
