'use client';

import * as React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ShoppingBag, Loader2, MoreHorizontal, Package, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { getSales } from '@/app/actions/sales-actions';
import { Sale } from '@/lib/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReceiveLensModal } from '@/components/clients/receive-lens-modal';
import { deliverLensOrder } from '@/app/actions/lens-orders-actions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface PurchaseHistoryTableProps {
    clientId: string;
}

// Extend Sale type locally to include createdAt if missing in shared types
interface ExtendedSale extends Sale {
    createdAt?: string;
}

export function PurchaseHistoryTable({ clientId }: PurchaseHistoryTableProps) {
    const { toast } = useToast();
    const [sales, setSales] = React.useState<ExtendedSale[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    // Modal state
    const [selectedSaleForReception, setSelectedSaleForReception] = React.useState<string | null>(null);
    const [isDeliveringOrder, setIsDeliveringOrder] = React.useState<string | null>(null);

    // Fetch sales for this client
    React.useEffect(() => {
        const loadSales = async () => {
            setIsLoading(true);
            try {
                const result = await getSales();
                if (result.success && result.data) {
                    // Filter by clientId and sort by date (newest first)
                    const clientSales = result.data
                        .filter(s => s.clientId?.toString() === clientId)
                        .sort((a, b) => {
                            const dateA = new Date(a.createdAt || a.date || 0).getTime();
                            const dateB = new Date(b.createdAt || b.date || 0).getTime();
                            return dateB - dateA;
                        });
                    setSales(clientSales as ExtendedSale[]);
                    console.log(`✅ Found ${clientSales.length} sales for client ${clientId}`);
                } else {
                    setSales([]);
                }
            } catch (error) {
                console.error('Error loading sales:', error);
                setSales([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadSales();
    }, [clientId]);

    const getStatusBadge = (status?: string, remaining?: number) => {
        // Normalize status
        const normalizedStatus = status?.toLowerCase();

        if (normalizedStatus === 'payé' || normalizedStatus === 'paye' || (remaining !== undefined && remaining <= 0)) {
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none">Payé</Badge>;
        }
        if (normalizedStatus === 'partiel') {
            return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 shadow-none">Partiel</Badge>;
        }
        if (normalizedStatus === 'impayé' || normalizedStatus === 'impaye') {
            return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 shadow-none">Impayé</Badge>;
        }
        if (normalizedStatus === 'devis') {
            return <Badge variant="outline" className="text-slate-600">Devis</Badge>;
        }

        return <Badge variant="outline">{status || 'Inconnu'}</Badge>;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy');
        } catch (e) {
            return dateString;
        }
    };

    const getItemsSummary = (sale: ExtendedSale) => {
        if (!sale.items || sale.items.length === 0) return 'Aucun article';

        const firstItem = sale.items[0];
        const productName = firstItem.nomProduit || firstItem.productName || 'Article inconnu';

        if (sale.items.length === 1) {
            return productName;
        }
        return `${productName} + ${sale.items.length - 1} autre(s)`;
    };

    const getLifecycleStatusBadge = (status?: string) => {
        if (!status || status === 'commandee') {
            return <Badge variant="outline" className="text-slate-600">En Commande</Badge>;
        }
        if (status === 'recue') {
            return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 shadow-none">Reçue (Stock)</Badge>;
        }
        if (status === 'livree') {
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none">Livrée</Badge>;
        }
        return null;
    };

    const handleDeliverOrder = async (saleId: string) => {
        setIsDeliveringOrder(saleId);
        try {
            const result = await deliverLensOrder(saleId);
            if (result.success) {
                toast({
                    title: "Succès",
                    description: "Commande marquée comme livrée",
                });
                // Reload sales after delivery
                const updatedResult = await getSales();
                if (updatedResult.success && updatedResult.data) {
                    const clientSales = updatedResult.data
                        .filter(s => s.clientId?.toString() === clientId)
                        .sort((a, b) => {
                            const dateA = new Date(a.createdAt || a.date || 0).getTime();
                            const dateB = new Date(b.createdAt || b.date || 0).getTime();
                            return dateB - dateA;
                        });
                    setSales(clientSales as ExtendedSale[]);
                }
            } else {
                toast({
                    title: "Erreur",
                    description: result.error || "Une erreur est survenue",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur",
                description: "Erreur lors de la livraison",
                variant: "destructive",
            });
        } finally {
            setIsDeliveringOrder(null);
        }
    };

    if (isLoading) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Historique d'Achats</CardTitle>
                    <CardDescription>Chargement de l'historique...</CardDescription>
                </CardHeader>
                <CardContent className="h-40 flex items-center justify-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </CardContent>
            </Card>
        );
    }

    if (!sales || sales.length === 0) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Historique d'Achats</CardTitle>
                    <CardDescription>Historique complet des transactions.</CardDescription>
                </CardHeader>
                <CardContent className="h-40 flex flex-col items-center justify-center text-slate-500">
                    <ShoppingBag className="h-8 w-8 mb-2 opacity-20" />
                    <p>Aucun achat enregistré pour ce client.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle>Historique d'Achats</CardTitle>
                <CardDescription>Historique complet des transactions ({sales.length}).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="w-[300px]">Articles</TableHead>
                            <TableHead className="text-right">Montant Total</TableHead>
                            <TableHead className="text-center">Statut Paiement</TableHead>
                            <TableHead className="text-center">Statut Commande</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.map((sale) => (
                            <TableRow key={sale.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-700">
                                    {formatDate(sale.createdAt || sale.date)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-normal text-slate-600">
                                        {sale.type || 'Vente'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    {getItemsSummary(sale)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    <SensitiveData value={sale.totalTTC || sale.totalNet || 0} type="currency" />
                                </TableCell>
                                <TableCell className="text-center">
                                    {getStatusBadge(sale.status, sale.resteAPayer)}
                                </TableCell>
                                <TableCell className="text-center">
                                    {getLifecycleStatusBadge(sale.status)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />

                                            <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/ventes/${sale.id}`} className="cursor-pointer">
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Voir Détails
                                                </Link>
                                            </DropdownMenuItem>

                                            {/* Show Reception button only if not received and not delivered */}
                                            {sale.status !== 'recue' && sale.status !== 'livree' && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setSelectedSaleForReception(sale.id)}
                                                        className="text-blue-600 focus:text-blue-600"
                                                    >
                                                        <Package className="mr-2 h-4 w-4" />
                                                        Réceptionner / Saisir Coût
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {/* Show Deliver button only if received but not delivered */}
                                            {sale.status === 'recue' && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeliverOrder(sale.id)}
                                                        disabled={isDeliveringOrder === sale.id}
                                                        className="text-green-600 focus:text-green-600"
                                                    >
                                                        {isDeliveringOrder === sale.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                        )}
                                                        Marquer comme Livré
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            {/* Receive Lens Modal */}
            <ReceiveLensModal
                open={!!selectedSaleForReception}
                onOpenChange={(open) => !open && setSelectedSaleForReception(null)}
                saleId={selectedSaleForReception || ''}
            />
        </Card>
    );
}
