'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFirebase, useFirestore } from '@/firebase';
import { getClients, createClient, deleteClient, Client } from '@/app/actions/clients-actions';
import { getSales } from '@/app/actions/sales-actions';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Users, Plus, Loader2, Trash2, Eye, Search, MoreHorizontal, Edit, CreditCard, ShoppingBag, UserCheck, TrendingUp, UserPlus } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SensitiveData } from '@/components/ui/sensitive-data';

// Extended Client type to include calculated fields
interface ExtendedClient extends Client {
    balance: number;
    lastVisit: Date | null;
}

export default function ClientsPage() {
    const { user } = useFirebase();
    const firestore = useFirestore();
    const { toast } = useToast();

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
        if (!user || !firestore) return;

        setIsLoading(true);
        try {
            console.log("🔄 Loading Clients Data...");
            // 1. Fetch Clients
            const clientsResult = await getClients(user.uid);

            if (!clientsResult.success) {
                console.error("❌ Failed to fetch clients:", clientsResult.error);
                toast({
                    title: 'Erreur',
                    description: 'Impossible de charger les clients.',
                    variant: 'destructive',
                });
                // Check if we should stop here or continue? Let's continue with empty list to avoid crash
            }

            const clientsData = clientsResult.success ? clientsResult.clients : [];
            console.log(`✅ Fetched ${clientsData.length} clients.`);

            // 2. Fetch Sales to calculate Balance & Last Visit (Via Server Action)
            const salesResult = await getSales(user.uid);
            const salesList = salesResult.success ? salesResult.sales : [];
            console.log(`✅ Fetched ${salesList.length} sales.`);

            const salesByClient: Record<string, any[]> = {};
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

                // Global Metrics Logic
                const reste = sale.resteAPayer || 0;
                if (reste > 0.01) {
                    totalCredit += reste;
                    ongoingOrders++;
                }
            });

            // 3. Merge Data
            const enrichedClients: ExtendedClient[] = clientsData.map(client => {
                const clientSales = salesByClient[client.id!] || [];

                // Calculate Balance (Sum of unpaid amounts)
                const balance = clientSales.reduce((sum, sale) => sum + (sale.resteAPayer || 0), 0);

                // Find Last Visit (Most recent sale date)
                let lastVisit: Date | null = null;
                if (clientSales.length > 0) {
                    // Sort sales by date desc
                    clientSales.sort((a, b) => {
                        const socketA = a.date || a.createdAt;
                        const socketB = b.date || b.createdAt;
                        if (!socketA) return 1;
                        if (!socketB) return -1;

                        // Handle Firestore timestamps vs Strings
                        const timeA = typeof socketA.toDate === 'function' ? socketA.toDate().getTime() : new Date(socketA).getTime();
                        const timeB = typeof socketB.toDate === 'function' ? socketB.toDate().getTime() : new Date(socketB).getTime();

                        return timeB - timeA;
                    });

                    const lastSale = clientSales[0];
                    const lastSaleDate = lastSale.date || lastSale.createdAt;

                    if (lastSaleDate) {
                        lastVisit = typeof lastSaleDate.toDate === 'function' ? lastSaleDate.toDate() : new Date(lastSaleDate);
                    }
                }

                // Fallback to client updated/created if no sales
                if (!lastVisit) {
                    if (client.updatedAt) lastVisit = new Date(client.updatedAt);
                    else if (client.createdAt) lastVisit = new Date(client.createdAt);
                }

                return {
                    ...client,
                    balance,
                    lastVisit
                };
            });

            // Default sort: alphabetical or by recent visit? 
            // Let's sort by creation/recent activity if possible, or name. 
            // The previous code had name sort.
            enrichedClients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            setClients(enrichedClients);
            setFilteredClients(enrichedClients);
            setMetrics({
                totalClients: enrichedClients.length,
                totalCredit: totalCredit,
                ongoingOrders: ongoingOrders
            });

        } catch (error) {
            console.error("💥 Error loading client data:", error);
            toast({
                title: '❌ Erreur',
                description: 'Une erreur critique est survenue.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, firestore, toast]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    // Search filter
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

    // Delete client
    const handleDelete = async (clientId: string) => {
        if (!user || !confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) return;

        // ✅ FIX: secureAction injects userId automatically, only pass clientId
        const result = await deleteClient(clientId);
        if (result.success) {
            toast({ title: '✅ Succès', description: result.message });
            loadData();
        } else {
            toast({ title: '❌ Erreur', description: result.error, variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-8 w-8" />
                        Clients / Patients
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Gérez vos clients, suivez leurs soldes et historiques.
                    </p>
                </div>

                <Button asChild className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
                    {/* Link to the NEW page we created to fix routing */}
                    <Link href="/dashboard/clients/new">
                        <Plus className="h-4 w-4" />
                        Nouveau Client
                    </Link>
                </Button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Clients */}
                <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Total Clients</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Users className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-bold text-slate-900">{metrics.totalClients}</h3>
                            <p className="text-xs text-slate-500">Clients enregistrés</p>
                        </div>
                    </div>
                </SpotlightCard>

                {/* Crédit Total */}
                <SpotlightCard className="p-6" spotlightColor="rgba(239, 68, 68, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Crédit Total (Impayés)</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                <CreditCard className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-bold text-slate-900">
                                <SensitiveData value={metrics.totalCredit} type="currency" />
                            </h3>
                            <p className="text-xs text-slate-500">Somme des soldes restants</p>
                        </div>
                    </div>
                </SpotlightCard>

                {/* Commandes en Cours */}
                <SpotlightCard className="p-6" spotlightColor="rgba(245, 158, 11, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Commandes en Cours</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <ShoppingBag className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-bold text-slate-900">{metrics.ongoingOrders}</h3>
                            <p className="text-xs text-slate-500">Non livrées ou partiellement payées</p>
                        </div>
                    </div>
                </SpotlightCard>
            </div>

            {/* Search Bar */}
            <SpotlightCard className="p-4">
                <div className="relative flex items-center">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom, téléphone ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 max-w-md bg-white border-slate-200"
                    />
                    <div className="ml-auto text-sm text-muted-foreground">
                        {filteredClients.length} résultats
                    </div>
                </div>
            </SpotlightCard>

            {/* Table or Empty State */}
            {filteredClients.length === 0 ? (
                // Only show empty state if truly no clients found
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-slate-50/50">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold text-muted-foreground">
                        {searchQuery ? 'Aucun résultat trouvé' : 'Aucun client'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Essayez des termes différents' : 'Ajoutez votre premier client pour commencer'}
                    </p>
                    {/* Add fallback button to add client if list is empty */}
                    {!searchQuery && (
                        <Button asChild className="mt-4 gap-2" variant="outline">
                            <Link href="/dashboard/clients/new">
                                <Plus className="h-4 w-4" />
                                Ajouter un Client
                            </Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[250px]">Nom Client</TableHead>
                                <TableHead>Téléphone</TableHead>
                                <TableHead>Mutuelle</TableHead>
                                <TableHead>Dernière Visite</TableHead>
                                <TableHead className="text-right">Solde</TableHead>
                                <TableHead className="text-right w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map((client) => {
                                // Formatting Last Visit
                                let lastVisitText = "Jamais";
                                if (client.lastVisit) {
                                    try {
                                        lastVisitText = format(client.lastVisit, 'dd/MM/yyyy');
                                    } catch (e) {
                                        // Fallback if date invalid
                                    }
                                }

                                return (
                                    <TableRow key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{client.name}</span>
                                                {client.email && (
                                                    <span className="text-xs text-slate-500">{client.email}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{client.phone}</TableCell>
                                        <TableCell>{client.mutuelle || '-'}</TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {lastVisitText}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {client.balance > 0.01 ? (
                                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-bold whitespace-nowrap">
                                                    <SensitiveData value={client.balance} type="currency" />
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 text-sm font-medium">0.00 MAD</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />

                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/clients/${client.id}`} className="cursor-pointer flex items-center">
                                                            <Eye className="mr-2 h-4 w-4 text-blue-500" />
                                                            Voir Dossier
                                                        </Link>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/clients/${client.id}/edit`} className="cursor-pointer flex items-center">
                                                            <Edit className="mr-2 h-4 w-4 text-orange-500" />
                                                            Modifier
                                                        </Link>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />

                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(client.id!)}
                                                        className="text-red-600 focus:text-red-600 cursor-pointer flex items-center"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Supprimer
                                                    </DropdownMenuItem>
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
