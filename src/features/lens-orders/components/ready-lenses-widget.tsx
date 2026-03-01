'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, Phone, User, CheckCircle2 } from 'lucide-react';
import { getGlobalAvailableLenses } from '@/app/actions/lens-orders-actions';
import { BrandLoader } from '@/components/ui/loader-brand';
import { cn } from '@/lib/utils';
import { SensitiveData } from '@/components/ui/sensitive-data';

export function ReadyLensesDashboardWidget() {
    const [lenses, setLenses] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        async function load() {
            try {
                const res = await getGlobalAvailableLenses();
                if (res.success) {
                    setLenses(res.data ?? []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    if (isLoading) {
        return (
            <Card className="border-indigo-100 shadow-sm animate-pulse">
                <CardHeader className="pb-2">
                    <div className="h-6 w-48 bg-slate-100 rounded mb-2"></div>
                    <div className="h-4 w-64 bg-slate-50 rounded"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-16 w-full bg-slate-50 rounded-lg"></div>)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (lenses.length === 0) return null;

    return (
        <Card className="border-indigo-200 bg-indigo-50/10 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 h-full flex flex-col">
            <CardHeader className="pb-3 bg-white/50 border-b border-indigo-100 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                            <Package className="h-5 w-5 text-indigo-600" />
                            Verres Prêts pour Livraison
                        </CardTitle>
                        <CardDescription className="text-indigo-600/70 font-medium">
                            {lenses.length} commande{lenses.length > 1 ? 's' : ''} reçue{lenses.length > 1 ? 's' : ''} à facturer et livrer.
                        </CardDescription>
                    </div>
                    <Badge className="bg-indigo-600 text-white border-none px-3 py-1 text-sm font-bold">
                        {lenses.length}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-indigo-100/50">
                        {lenses.map((order) => (
                            <div key={order.id} className="bg-white p-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-slate-400" />
                                            <p className="font-bold text-slate-900 truncate text-sm">
                                                {order.client.fullName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 uppercase border-slate-200 font-bold px-1.5">
                                                {order.lensType}
                                            </Badge>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-[11px] font-black text-indigo-700">
                                                <SensitiveData value={parseFloat(order.sellingPrice)} type="currency" />
                                            </span>
                                        </div>
                                        {order.client.phone && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 w-fit px-2 py-1 rounded-md">
                                                <Phone className="h-3 w-3" />
                                                {order.client.phone}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <Button 
                                            size="sm" 
                                            asChild
                                            className="bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold shadow-sm h-7 px-2"
                                        >
                                            <Link href={`/dashboard/clients/${order.client.id}?tab=sales`}>
                                                Livrer au POS
                                                <ArrowRight className="ml-1 h-3 w-3" />
                                            </Link>
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            asChild
                                            className="h-7 text-[10px] font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                        >
                                            <Link href={`/dashboard/clients/${order.client.id}`}>
                                                Dossier
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
