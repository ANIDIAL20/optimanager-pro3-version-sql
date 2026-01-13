'use client';

import * as React from 'react';
import {
    getSales,
} from '@/app/actions/sales-actions';
import { getClients } from '@/app/actions/clients-actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Search,
    TrendingUp,
    AlertTriangle,
    ShoppingBag,
    LayoutGrid,
    List,
    Table as TableIcon,
    MoreHorizontal,
    ArrowUpRight,
    Calendar,
    Package,
    Plus,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sale, Client } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { DataTable } from '@/components/ui/data-table';
import { columns, type Order } from '@/components/dashboard/commandes/columns';

// --- Utility: Safe Number Access ---
const safeNum = (num: number | undefined) => num || 0;

// --- Utility: Format Currency ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
};

// --- Main Page Component ---
export default function VentesPage() {
    // --- Data Fetching (Server Actions) ---
    const [sales, setSales] = React.useState<Sale[]>([]);
    const [clients, setClients] = React.useState<Client[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        async function loadData() {
            try {
                // Parallel fetch for verify performance
                const [salesRes, clientsRes] = await Promise.all([
                   getSales(),
                   getClients()
                ]);

                if (salesRes.success) {
                    setSales((salesRes.sales as any[]) || []);
                } else {
                    throw new Error(salesRes.error);
                }

                if (clientsRes.success && clientsRes.clients) {
                    // Adapt clients to legacy interface
                    const adaptedClients: any[] = clientsRes.clients.map(c => {
                        const nameParts = c.name.split(' ');
                        const prenom = nameParts.length > 1 ? nameParts[0] : '';
                        const nom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : c.name;
                        return {
                            ...c,
                            nom,
                            prenom,
                            telephone1: c.phone || '',
                            id: c.id?.toString() || '',
                        };
                    });
                     setClients(adaptedClients);
                } else {
                   // Non-critical
                   console.error("Failed to load clients:", clientsRes.error);
                }

            } catch (err: any) {
                console.error("Error loading sales data:", err);
                setError("Impossible de charger les ventes.");
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    const clientsMap = React.useMemo(() => {
        if (!clients) return new Map();
        return new Map(clients.map(c => [c.id, c]));
    }, [clients]);


    // --- State ---
    const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'table'>('table');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState<'all' | 'paid' | 'unpaid'>('all');

    // --- Filtering Logic ---
    const filteredSales = React.useMemo(() => {
        if (!sales) return [];
        return sales.filter(sale => {
            const client = clientsMap.get(sale.clientId || ''); // Handle undefined clientId
            const clientName = client ? `${client.nom || ''} ${client.prenom || ''} ${client.name || ''}` : ''; // Handle legacy and new types
            
            const searchMatch =
                clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sale.saleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || // Use saleNumber or fallback to ID check
                sale.id.toLowerCase().includes(searchTerm.toLowerCase());

            const isPaid = safeNum(sale.resteAPayer) <= 0.01;
            const statusMatch =
                filterStatus === 'all' ? true :
                    filterStatus === 'paid' ? isPaid : !isPaid;

            return searchMatch && statusMatch;
        });
    }, [sales, clientsMap, searchTerm, filterStatus]);

    // Join sales with client data for the DataTable
    const ordersWithClientData = React.useMemo((): Order[] => {
        if (!filteredSales) return [];
        return filteredSales.map(sale => {
            const client = clientsMap.get(sale.clientId || '');
            // Adapter for Order type logic
            // Order type (from columns.tsx) likely expects clientNom/clientPrenom.
            // Our actions return Client with `name` (and potentially legacy fields).
            // Let's coerce or map best effort.
            
            let nom = client?.nom || '';
            let prenom = client?.prenom || '';
            
            if (!nom && !prenom && client?.name) {
                 const part = client.name.split(' ');
                 prenom = part[0];
                 nom = part.slice(1).join(' ');
            }

            return {
                ...sale,
                clientNom: nom,
                clientPrenom: prenom,
                // Ensure mandatory fields for Order type if missing in Sale
                // Sale has id, totalNet... Order likely similar.
            } as any as Order; 
        });
    }, [filteredSales, clientsMap]);

    // --- Stats Logic ---
    const stats = React.useMemo(() => {
        const totalRev = sales.reduce((acc, s) => acc + safeNum(s.totalNet), 0);
        const totalUnpaid = sales.reduce((acc, s) => acc + safeNum(s.resteAPayer), 0);
        const count = sales.length;
        return { totalRev, totalUnpaid, count };
    }, [sales]);

    if (isLoading) return <LoadingSkeleton />;
    if (error) return <ErrorState />;

    return (
        <div className="space-y-6">

            {/* --- Header Section --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Ventes
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Gérez vos ventes avec style et précision.
                    </p>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-2">
                    <Button asChild className="gap-2">
                        <Link href="/dashboard/ventes/new">
                            <Plus className="h-4 w-4" />
                            Nouvelle Vente
                        </Link>
                    </Button>
                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="gap-2"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden sm:inline">Grille</span>
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="gap-2"
                    >
                        <List className="h-4 w-4" />
                        <span className="hidden sm:inline">Liste</span>
                    </Button>
                    <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="gap-2"
                    >
                        <TableIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Tableau</span>
                    </Button>
                </div>
            </div>

            {/* --- Stats Section (Spotlight Cards) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Chiffre d'Affaires</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-bold text-slate-900">
                                <SensitiveData value={stats.totalRev} type="currency" />
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-blue-600">
                                <ArrowUpRight className="h-4 w-4" />
                                <span className="font-medium">+12% ce mois</span>
                            </div>
                        </div>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor="rgba(139, 92, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Total Ventes</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <ShoppingBag className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-bold text-slate-900">{stats.count}</h3>
                            <p className="text-sm text-slate-500">+5 cette semaine</p>
                        </div>
                    </div>
                </SpotlightCard>

                <SpotlightCard className={cn("p-6", stats.totalUnpaid > 0 && "ring-2 ring-orange-500/50")} spotlightColor="rgba(249, 115, 22, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Impayés</p>
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stats.totalUnpaid > 0 ? "bg-orange-100" : "bg-slate-100")}>
                                <AlertTriangle className={cn("h-4 w-4", stats.totalUnpaid > 0 ? "text-orange-600" : "text-slate-500")} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className={cn("text-3xl font-bold", stats.totalUnpaid > 0 ? "text-red-600" : "text-slate-900")}>
                                <SensitiveData
                                    value={stats.totalUnpaid}
                                    type="currency"
                                    className={stats.totalUnpaid > 0 ? "text-red-600" : "text-slate-900"}
                                />
                            </h3>
                            <p className={cn("text-sm", stats.totalUnpaid > 0 ? "text-orange-600" : "text-slate-500")}>
                                {stats.totalUnpaid > 0 ? "Action requise" : "Aucun impayé"}
                            </p>
                        </div>
                    </div>
                </SpotlightCard>
            </div>

            {/* --- Filter Bar --- */}
            <SpotlightCard className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher client, ID..."
                            className="pl-10 bg-white border-slate-200 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Tabs value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)} className="w-full md:w-auto">
                        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                            <TabsTrigger value="all">Tout</TabsTrigger>
                            <TabsTrigger value="paid">Payés</TabsTrigger>
                            <TabsTrigger value="unpaid">Impayés</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </SpotlightCard>

            {/* --- Content Area --- */}
            <div className="min-h-[400px]">
                {filteredSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <ShoppingBag className="h-16 w-16 mb-4 opacity-20" />
                        <p>Aucune vente trouvée pour ces critères.</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <DataTable
                        columns={columns}
                        data={ordersWithClientData}
                        searchKey="clientNom"
                        searchValue={searchTerm}
                    />
                ) : (
                    viewMode === 'grid'
                        ? <KanbanGrid sales={filteredSales} clientsMap={clientsMap} />
                        : <EnhancedListView sales={filteredSales} clientsMap={clientsMap} />
                )}
            </div>

        </div>
    );
}

// --- Components ---

function KanbanGrid({ sales, clientsMap }: { sales: Sale[], clientsMap: Map<string, Client> }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(sales || []).map(sale => {
                const client = clientsMap.get(sale.clientId);
                const isPaid = safeNum(sale.resteAPayer) <= 0.01;

                return (
                    <SpotlightCard key={sale.id} className="p-4" spotlightColor={isPaid ? "rgba(34, 197, 94, 0.15)" : "rgba(249, 115, 22, 0.15)"}>
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        <AvatarImage src={client?.photoUrl} />
                                        <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-sm">
                                            {client?.prenom?.[0]}{client?.nom?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-slate-900 truncate">
                                            {client ? `${client.prenom} ${client.nom}` : 'Client Inconnu'}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {(() => {
                                                const d = sale.date ? new Date(sale.date) : null;
                                                return d && !isNaN(d.getTime()) ? format(d, 'dd MMM', { locale: fr }) : '-';
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <Link href={`/dashboard/ventes/${sale.id}`}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>

                            {/* Amount */}
                            <div className="flex justify-between items-baseline">
                                <span className="text-2xl font-bold text-slate-900">
                                    <SensitiveData value={sale.totalNet} type="currency" currency="dh" />
                                </span>
                                <Badge
                                    variant={isPaid ? "secondary" : "outline"}
                                    className={cn(
                                        "rounded-full px-3",
                                        isPaid ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"
                                    )}
                                >
                                    {isPaid ? "Payé" : "Impayé"}
                                </Badge>
                            </div>

                            {/* Remaining Amount */}
                            {!isPaid && (
                                <div className="bg-orange-50 p-2 rounded-md text-orange-800 text-xs font-medium flex justify-between">
                                    <span>Reste:</span>
                                    <span><SensitiveData value={sale.resteAPayer} type="currency" currency="dh" /></span>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                <span className="font-mono">#{sale.id.slice(0, 6)}</span>
                                <div className="flex gap-2">
                                    <Link href={`/clients/${sale.clientId}`} className="hover:text-blue-600 transition-colors">Profil</Link>
                                    <Link href={`/clients/${sale.clientId}/invoice/${sale.id}`} className="hover:text-blue-600 transition-colors">Facture</Link>
                                </div>
                            </div>
                        </div>
                    </SpotlightCard>
                );
            })}
        </div>
    );
}

function EnhancedListView({ sales, clientsMap }: { sales: Sale[], clientsMap: Map<string, Client> }) {
    return (
        <SpotlightCard className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-xs font-medium text-slate-600 uppercase tracking-wide">
                    <div className="col-span-3">Vente</div>
                    <div className="col-span-3">Client</div>
                    <div className="col-span-2">Montant</div>
                    <div className="col-span-2">Statut</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Rows */}
                {sales.map(sale => {
                    const client = clientsMap.get(sale.clientId);
                    const isPaid = safeNum(sale.resteAPayer) <= 0.01;

                    return (
                        <div key={sale.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors items-center">
                            <div className="col-span-3 space-y-1">
                                <span className="font-mono font-medium text-xs text-slate-900">#{sale.id.slice(0, 6)}</span>
                                <p className="text-xs text-slate-500">
                                    {(() => {
                                        const d = sale.date ? new Date(sale.date) : null;
                                        return d && !isNaN(d.getTime()) ? format(d, 'dd/MM/yyyy HH:mm') : '-';
                                    })()}
                                </p>
                            </div>

                            <div className="col-span-3 flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-blue-100 text-blue-600">{client?.prenom?.[0]}{client?.nom?.[0]}</AvatarFallback>
                                </Avatar>
                                <Link href={`/clients/${client?.id}`} className="font-medium text-sm hover:text-blue-600 transition-colors truncate">
                                    {client ? `${client.prenom} ${client.nom}` : 'Inconnu'}
                                </Link>
                            </div>

                            <div className="col-span-2">
                                <div className="font-bold text-slate-900">
                                    <SensitiveData value={sale.totalNet} type="currency" />
                                </div>
                                {!isPaid && (
                                    <div className="text-xs text-orange-600 font-medium">
                                        Reste: <SensitiveData value={sale.resteAPayer} type="currency" className="text-orange-600" />
                                    </div>
                                )}
                            </div>

                            <div className="col-span-2">
                                <Badge variant={isPaid ? "secondary" : "outline"} className={cn(isPaid ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200")}>
                                    {isPaid ? "Payé" : "En Attente"}
                                </Badge>
                            </div>

                            <div className="col-span-2 text-right">
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/dashboard/ventes/${sale.id}`}>Voir</Link>
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SpotlightCard>
    );
}

function LoadingSkeleton() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        </div>
    );
}

function ErrorState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Erreur de chargement</h2>
            <p className="text-slate-600">Impossible de récupérer les données des commandes.</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
    );
}
