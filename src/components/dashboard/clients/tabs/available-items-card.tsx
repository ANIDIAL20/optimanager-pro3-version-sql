'use client';

import * as React from 'react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { getPendingLensOrders, type LensOrder } from '@/app/actions/lens-orders-actions';
import { BrandLoader } from '@/components/ui/loader-brand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SensitiveData } from '@/components/ui/sensitive-data';

interface AvailableItemsCardProps {
    clientId: string;
    onAction?: (tab: string) => void;
}

export function AvailableItemsCard({ clientId, onAction }: AvailableItemsCardProps) {
    const [availableLenses, setAvailableLenses] = React.useState<LensOrder[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchAvailable() {
            setIsLoading(true);
            try {
                const result = await getPendingLensOrders(clientId);
                if (result.success && result.data) {
                    // We define "Available" as Received but not yet delivered/billed
                    const received = (result.data as LensOrder[]).filter(o => o.status === 'received');
                    setAvailableLenses(received);
                }
            } catch (error) {
                console.error("Failed to fetch available lenses", error);
            } finally {
                setIsLoading(false);
            }
        }
        if (clientId) fetchAvailable();
    }, [clientId]);

    if (isLoading) {
        return (
            <SpotlightCard className="p-6 h-full flex flex-col items-center justify-center min-h-[160px]">
                <BrandLoader size="sm" />
                <p className="text-xs text-slate-400 mt-2">Recherche d'articles...</p>
            </SpotlightCard>
        );
    }

    const count = availableLenses.length;

    return (
        <SpotlightCard 
            className={cn(
                "p-6 h-full flex flex-col",
                count > 0 ? "border-indigo-200 bg-indigo-50/10" : "opacity-80"
            )}
            spotlightColor={count > 0 ? "rgba(79, 70, 229, 0.15)" : "rgba(148, 163, 184, 0.1)"}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Package className={cn("h-5 w-5", count > 0 ? "text-indigo-600" : "text-slate-400")} />
                    Articles Disponibles
                </h3>
                {count > 0 && (
                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse hover:animate-none">
                        {count} Prêt{count > 1 ? 's' : ''}
                    </Badge>
                )}
            </div>

            <div className="flex-1 space-y-3">
                {count > 0 ? (
                    <div className="space-y-2">
                        {availableLenses.map((lens) => (
                            <div key={lens.id} className="bg-white p-2 rounded-lg border border-indigo-100 shadow-sm flex items-center justify-between group">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {lens.lensType}
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-tight">
                                        {lens.orderType} • Reçu le {lens.receivedDate ? new Date(lens.receivedDate).toLocaleDateString() : 'Récemment'}
                                    </p>
                                </div>
                                <div className="text-right ml-2">
                                     <div className="text-xs font-bold text-indigo-600">
                                         <SensitiveData value={parseFloat(lens.sellingPrice)} type="currency" />
                                     </div>
                                </div>
                            </div>
                        ))}
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-bold gap-1 group"
                            onClick={() => onAction?.('sales')}
                        >
                            Facturer au POS
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-4 text-center">
                        <CheckCircle2 className="h-8 w-8 text-slate-200 mb-2" />
                        <p className="text-sm text-slate-500 font-medium">Tout est à jour</p>
                        <p className="text-[11px] text-slate-400 px-4">
                            Aucun verre en attente de livraison pour ce client.
                        </p>
                    </div>
                )}
            </div>
        </SpotlightCard>
    );
}
