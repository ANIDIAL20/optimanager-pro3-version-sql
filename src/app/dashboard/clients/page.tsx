'use client';

import * as React from 'react';
import Link from 'next/link';
import { getClients, deleteClient } from '@/features/clients/actions';
import { getSales } from '@/features/sales/actions';
import { type Client } from '@/features/clients/repository';
import { type Sale } from '@/features/sales/repository';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Users, Plus, Trash2, Eye, Search, MoreHorizontal, Edit, CreditCard, ShoppingBag } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { BrandLoader } from '@/components/ui/loader-brand';
import { useMode } from '@/contexts/mode-context';

// Extended Client type to include calculated fields
interface ExtendedClient {
    id: string; // UI expects string IDs
    name: string; // UI expects 'name' (mapped from fullName)
    email?: string | null;
    phone?: string | null;
    mutuelle?: string | null;
    address?: string | null;
    balance: number;
    creditLimit?: number;
    lastVisit: Date | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export default function ClientsPage() {
    const { toast } = useToast();
    const { isBasicMode } = useMode();

    const [clients, setClients] = React.useState<ExtendedClient[]>([]);
    const [filteredClients, setFilteredClients] = React.useState<ExtendedClient[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Metrics State
    const [metrics, setMetrics] = React.useState({
        totalClients: 0,
        totalCredit: 0,
        ongoingOrders: 0,
    });

    // Load data (Clients + Sales)
    const loadData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const clientsData = await getClients(undefined);
            const salesList = await getSales(undefined);

            const salesByClient: Record<number, Sale[]> = {};
            let totalCredit = 0;
            let ongoingOrders = 0;

            salesList.forEach(sale => {
                const clientId = sale.clientId;
                if (clientId) {
                    if (!salesByClient[clientId]) {
                        salesByClient[clientId] = [];
                    }
                    salesByClient[clientId].push(sale);
                }

                const reste = parseFloat(sale.resteAPayer || '0');
                if (reste > 0.01) {
                    totalCredit += reste;
                    ongoingOrders++;
                }
            });

            const enrichedClients: ExtendedClient[] = clientsData.map(client => {
                const clientSales = salesByClient[client.id] || [];
                const balance = clientSales.reduce((sum, sale) => sum + parseFloat(sale.resteAPayer || '0'), 0);

                let lastVisit: Date | null = null;
                if (clientSales.length > 0) {
                    clientSales.sort((a, b) => {
                        const dateA = a.date ? new Date(a.date) : new Date(a.createdAt || 0);
                        const dateB = b.date ? new Date(b.date) : new Date(b.createdAt || 0);
                        return dateB.getTime() - dateA.getTime();
                    });
                    const lastSale = clientSales[0];
                    lastVisit = lastSale.date ? new Date(lastSale.date) : new Date(lastSale.createdAt || 0);
                }

                if (!lastVisit) {
                    if (client.updatedAt) lastVisit = new Date(client.updatedAt);
                    else if (client.createdAt) lastVisit = new Date(client.createdAt);
                }

                return {
                    id: client.id.toString(),
                    name: client.fullName,
                    email: client.email,
                    phone: client.phone,
                    mutuelle: client.mutuelle,
                    address: client.address,
                    balance,
                    creditLimit: parseFloat(client.creditLimit || '5000'),
                    lastVisit,
                    createdAt: client.createdAt,
                    updatedAt: client.updatedAt
                };
            });

            enrichedClients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            setClients(enrichedClients);
            setFilteredClients(enrichedClients);
            setMetrics({
                totalClients: enrichedClients.length,
                totalCredit: totalCredit,
                ongoingOrders: ongoingOrders
            });

        } catch (error: any) {
            console.error("💥 Error loading client data:", error);
            toast({
                title: '❌ Erreur',
                description: error.message || 'Impossible de charger les données.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    React.useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredClients(clients);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            setFilteredClients(
                clients.filter(
                    client =>
                        (client.name || '').toLowerCase().includes(lowerQuery) ||
                        (client.phone || '').includes(searchQuery)
                )
            );
        }
    }, [searchQuery, clients]);

    const handleDelete = async (clientId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) return;
        try {
            await deleteClient(clientId);
            toast({ title: '✅ Succès', description: 'Client supprimé avec succès.' });
            loadData();
        } catch (error: any) {
            toast({ title: '❌ Erreur', description: error.message, variant: 'destructive' });
        }
    };

    const getFinancialHealthBadge = (client: ExtendedClient) => {
        const balance = client.balance;
        const limit = client.creditLimit || 5000;
        if (balance <= 0) return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Parfait</Badge>;
        if (balance < limit * 0.4) return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sain</Badge>;
        if (balance < limit) return <Badge className="bg-amber-50 text-amber-700 border-amber-200">À surveiller</Badge>;
        return <Badge className="bg-red-50 text-red-700 border-red-200 animate-pulse">Critique</Badge>;
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><BrandLoader size="md" /></div>;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clients / Patients</h1>
                        <p className="text-slate-500 mt-1">Gérez vos clients, suivez leurs soldes et historiques.</p>
                    </div>
                </div>
                <Button asChild className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Link href="/dashboard/clients/new"><Plus className="h-4 w-4" />Nouveau Client</Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SpotlightCard className="p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Total Clients</p>
                        <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{metrics.totalClients}</h3>
                </SpotlightCard>
                <SpotlightCard className="p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Crédit Total</p>
                        <CreditCard className="h-4 w-4 text-red-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2"><SensitiveData value={metrics.totalCredit} type="currency" /></h3>
                </SpotlightCard>
                <SpotlightCard className="p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Commandes en Cours</p>
                        <ShoppingBag className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{metrics.ongoingOrders}</h3>
                </SpotlightCard>
            </div>

            <SpotlightCard className="p-4">
                <div className="relative flex items-center">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 max-w-md"
                    />
                </div>
            </SpotlightCard>

            {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-slate-50/50">
                    <p className="text-xl font-semibold text-muted-foreground">Aucun client</p>
                </div>
            ) : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[250px]">Nom Client</TableHead>
                                <TableHead>Téléphone</TableHead>
                                {!isBasicMode && <TableHead>Mutuelle</TableHead>}
                                <TableHead>Dernière Visite</TableHead>
                                {!isBasicMode && <TableHead className="text-center">Santé Fin.</TableHead>}
                                <TableHead className="text-right">Solde</TableHead>
                                <TableHead className="text-right w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map((client) => {
                                let lastVisitText = "Jamais";
                                if (client.lastVisit) {
                                    try {
                                        lastVisitText = format(client.lastVisit, 'dd/MM/yyyy');
                                    } catch (e) {}
                                }

                                return (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{client.name}</span>
                                                {!isBasicMode && client.email && <span className="text-xs text-slate-500">{client.email}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>{client.phone}</TableCell>
                                        {!isBasicMode && <TableCell>{client.mutuelle || '-'}</TableCell>}
                                        <TableCell>{lastVisitText}</TableCell>
                                        {!isBasicMode && <TableCell className="text-center">{getFinancialHealthBadge(client)}</TableCell>}
                                        <TableCell className="text-right">
                                            {client.balance > 0.01 ? (
                                                <Badge variant="outline" className="bg-red-50 text-red-600">
                                                    <SensitiveData value={client.balance} type="currency" />
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">0.00 MAD</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild><Link href={`/dashboard/clients/${client.id}`}><Eye className="mr-2 h-4 w-4" />Voir Dossier</Link></DropdownMenuItem>
                                                    <DropdownMenuItem asChild><Link href={`/dashboard/clients/${client.id}/edit`}><Edit className="mr-2 h-4 w-4" />Modifier</Link></DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
