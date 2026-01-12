'use client';

import * as React from 'react';
import { useFirebase } from '@/firebase';
import { getClientSales, Sale } from '@/app/actions/sales-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, ShoppingBag, Info } from 'lucide-react';

interface PurchaseHistoryListProps {
    clientId: string;
}

export function PurchaseHistoryList({ clientId }: PurchaseHistoryListProps) {
    const { user } = useFirebase();
    const [sales, setSales] = React.useState<Sale[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        async function fetchHistory() {
            if (!user) return;
            setIsLoading(true);
            try {
                // ✅ FIX: secureAction injects userId automatically
                const result = await getClientSales(clientId);
                if (result.success && result.sales) {
                    setSales(result.sales);
                } else {
                    setError("Impossible de charger l'historique.");
                }
            } catch (err) {
                setError("Une erreur est survenue.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchHistory();
    }, [user, clientId]);

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">
                <Info className="h-6 w-6 mx-auto mb-2" />
                {error}
            </div>
        );
    }

    if (sales.length === 0) {
        return (
            <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-lg">
                <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Aucun achat</h3>
                <p className="text-slate-500">Ce client n'a pas encore effectué d'achat.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Articles</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-right">Reste</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.map((sale) => (
                        <TableRow key={sale.id}>
                            <TableCell className="font-medium text-slate-700">
                                {format(new Date(sale.createdAt), 'dd MMM yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    {sale.items.map((item, idx) => (
                                        <div key={idx} className="text-sm text-slate-600">
                                            {item.quantity}x {item.productName}
                                        </div>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={sale.status} remains={sale.resteAPayer} />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                <SensitiveData value={sale.totalTTC || sale.totalNet || 0} type="currency" />
                            </TableCell>
                            <TableCell className="text-right">
                                {sale.resteAPayer > 0.01 ? (
                                    <span className="text-red-600 font-semibold">
                                        <SensitiveData value={sale.resteAPayer} type="currency" />
                                    </span>
                                ) : (
                                    <span className="text-green-600 font-medium text-xs">Payé</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function StatusBadge({ status, remains }: { status?: string, remains: number }) {
    // Navigate based on status or remaining amount logic
    if (remains <= 0.01) {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none">Payé</Badge>;
    }
    if (status === 'devis') {
        return <Badge variant="outline" className="text-slate-600 border-slate-300">Devis</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 shadow-none">Impayé</Badge>;
}
