'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Search,
    TrendingUp,
    FileText,
    LayoutGrid,
    List,
    Table as TableIcon,
    MoreHorizontal,
    Plus,
    Clock,
    CheckCircle,
    XCircle,
    ArrowUpRight
} from 'lucide-react';
import type { Devis } from '@/app/actions/devis-actions';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { DataTable } from '@/components/ui/data-table';
import { columns, type DevisRow } from '@/components/dashboard/devis/columns';
import { CreateDevisModal } from './_components/create-devis-modal';
import Link from 'next/link';

// --- Utility: Safe Number Access ---
const safeNum = (num: number | undefined) => num || 0;

interface DevisClientPageProps {
    initialDevis: Devis[];
    initialError: string | null;
}

export function DevisClientPage({ initialDevis, initialError }: DevisClientPageProps) {
    const [devisList, setDevisList] = React.useState<Devis[]>(initialDevis);
    const [error] = React.useState<string | null>(initialError);

    // --- State ---
    const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'table'>('table');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState<'all' | 'EN_ATTENTE' | 'VALIDE' | 'TRANSFORME' | 'REFUSE'>('all');

    // --- Reload Callback ---
    const handleReload = () => {
        window.location.reload(); 
        // In a real app we might re-fetch data here, but full page reload works for Server Component refresh
    };

    // --- Filtering Logic ---
    const filteredDevis = React.useMemo(() => {
        if (!devisList) return [];
        return devisList.filter(devis => {
            const clientName = devis.clientName || '';
            
            const searchMatch =
                clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (devis.id && devis.id.toLowerCase().includes(searchTerm.toLowerCase()));

            const statusMatch = filterStatus === 'all' || devis.status === filterStatus;

            return searchMatch && statusMatch;
        });
    }, [devisList, searchTerm, filterStatus]);

    // Data for DataTable
    const tableData = React.useMemo((): DevisRow[] => {
        return filteredDevis;
    }, [filteredDevis]);

    // --- Stats Logic ---
    const stats = React.useMemo(() => {
        const totalValue = devisList.reduce((acc, d) => acc + safeNum(d.totalTTC), 0);
        const count = devisList.length;
        const pendingCount = devisList.filter(d => d.status === 'EN_ATTENTE').length;
        const validatedCount = devisList.filter(d => d.status === 'VALIDE' || d.status === 'TRANSFORME').length;
        
        return { totalValue, count, pendingCount, validatedCount };
    }, [devisList]);

    if (error) return <ErrorState message={error} />;

    return (
        <div className="space-y-6">

            {/* --- Header Section --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Mes Devis
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Gérez vos devis et propositions commerciales.
                    </p>
                </div>

                {/* View Switcher & Actions */}
                <div className="flex items-center gap-2">
                    <CreateDevisModal onSuccess={handleReload}>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nouveau Devis
                        </Button>
                    </CreateDevisModal>

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
                            <p className="text-sm font-medium text-slate-600">Total Devis</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-bold text-slate-900">
                                {stats.count}
                            </h3>
                            <p className="text-sm text-slate-500">
                                Valeur: <SensitiveData value={stats.totalValue} type="currency" />
                            </p>
                        </div>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor="rgba(249, 115, 22, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">En Attente</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-bold text-slate-900">{stats.pendingCount}</h3>
                            <p className="text-sm text-slate-500">Devis en attente de réponse</p>
                        </div>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Validés / Transformés</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                             <h3 className="text-3xl font-bold text-slate-900">{stats.validatedCount}</h3>
                            <p className="text-sm text-slate-500">Devis acceptés et signés</p>
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
                            placeholder="Rechercher client, N° devis..."
                            className="pl-10 bg-white border-slate-200 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Tabs value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)} className="w-full md:w-auto">
                        <TabsList className="grid w-full grid-cols-4 md:w-[500px]">
                            <TabsTrigger value="all">Tout</TabsTrigger>
                            <TabsTrigger value="EN_ATTENTE">En Attente</TabsTrigger>
                            <TabsTrigger value="VALIDE">Validé</TabsTrigger>
                            <TabsTrigger value="TRANSFORME">Transformé</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </SpotlightCard>

            {/* --- Content Area --- */}
            <div className="min-h-[400px]">
                {filteredDevis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border rounded-lg bg-white/50 border-dashed">
                        <FileText className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-900">Aucun devis trouvé</p>
                         <p className="text-sm mb-6">Modifiez vos filtres ou créez un nouveau devis</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <DataTable
                        columns={columns}
                        data={tableData}
                        searchKey="clientName"
                        searchValue={searchTerm}
                    />
                ) : (
                    viewMode === 'grid'
                        ? <DevisGrid devisList={filteredDevis} />
                        : <DevisListView devisList={filteredDevis} />
                )}
            </div>

        </div>
    );
}

// --- Components ---

function DevisGrid({ devisList }: { devisList: Devis[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devisList.map(devis => {
                 const status = devis.status || 'EN_ATTENTE';
                 let color = "rgba(249, 115, 22, 0.15)"; // Orange default
                 if (status === 'VALIDE') color = "rgba(59, 130, 246, 0.15)";
                 if (status === 'TRANSFORME') color = "rgba(34, 197, 94, 0.15)";
                 if (status === 'REFUSE') color = "rgba(239, 68, 68, 0.15)";

                return (
                    <SpotlightCard key={devis.id} className="p-4" spotlightColor={color}>
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="font-semibold text-sm text-slate-900 truncate" title={devis.clientName}>
                                        {devis.clientName}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {(() => {
                                            const d = devis.createdAt ? new Date(devis.createdAt) : null;
                                            return d && !isNaN(d.getTime()) ? format(d, 'dd MMM', { locale: fr }) : '-';
                                        })()}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <Link href={`/dashboard/devis/${devis.id}`}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>

                            {/* Amount */}
                            <div className="flex justify-between items-baseline">
                                <span className="text-2xl font-bold text-slate-900">
                                    <SensitiveData value={devis.totalTTC} type="currency" currency="dh" />
                                </span>
                            </div>
                            
                            {/* Status and Items */}
                            <div className="flex items-center justify-between text-xs">
                                <Badge variant="outline" className={cn(
                                    "rounded-full px-2",
                                    status === 'EN_ATTENTE' && "bg-orange-50 text-orange-700 border-orange-200",
                                    status === 'VALIDE' && "bg-blue-50 text-blue-700 border-blue-200",
                                    status === 'TRANSFORME' && "bg-green-50 text-green-700 border-green-200",
                                    status === 'REFUSE' && "bg-red-50 text-red-700 border-red-200",
                                )}>
                                    {status.toLowerCase().replace('_', ' ')}
                                </Badge>
                                <span className="text-slate-500">{devis.items.length} articles</span>
                            </div>

                            {/* Footer */}
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                <span className="font-mono">#{devis.id?.slice(0, 8)}</span>
                            </div>
                        </div>
                    </SpotlightCard>
                );
            })}
        </div>
    );
}

function DevisListView({ devisList }: { devisList: Devis[] }) {
    return (
        <SpotlightCard className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-xs font-medium text-slate-600 uppercase tracking-wide">
                    <div className="col-span-3">N° / Date</div>
                    <div className="col-span-4">Client</div>
                    <div className="col-span-2">Montant TTC</div>
                    <div className="col-span-2">Statut</div>
                    <div className="col-span-1 text-right"></div>
                </div>

                {/* Rows */}
                {devisList.map(devis => {
                    const status = devis.status || 'EN_ATTENTE';

                    return (
                        <div key={devis.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors items-center">
                             <div className="col-span-3 space-y-1">
                                <span className="font-mono font-medium text-xs text-slate-900">#{devis.id?.slice(0, 8)}</span>
                                <p className="text-xs text-slate-500">
                                    {(() => {
                                        const d = devis.createdAt ? new Date(devis.createdAt) : null;
                                        return d && !isNaN(d.getTime()) ? format(d, 'dd/MM/yyyy') : '-';
                                    })()}
                                </p>
                            </div>

                            <div className="col-span-4 font-medium text-sm text-slate-700 truncate">
                                {devis.clientName}
                            </div>

                            <div className="col-span-2 font-bold text-slate-900">
                                <SensitiveData value={devis.totalTTC} type="currency" />
                            </div>

                            <div className="col-span-2">
                                <Badge variant="outline" className={cn(
                                    "rounded-full px-2",
                                    status === 'EN_ATTENTE' && "bg-orange-50 text-orange-700 border-orange-200",
                                    status === 'VALIDE' && "bg-blue-50 text-blue-700 border-blue-200",
                                    status === 'TRANSFORME' && "bg-green-50 text-green-700 border-green-200",
                                    status === 'REFUSE' && "bg-red-50 text-red-700 border-red-200",
                                )}>
                                    {status.toLowerCase().replace('_', ' ')}
                                </Badge>
                            </div>

                            <div className="col-span-1 text-right">
                                <Button size="sm" variant="ghost" asChild>
                                    <Link href={`/dashboard/devis/${devis.id}`}>
                                        <ArrowUpRight className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SpotlightCard>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <div className="bg-red-100 p-4 rounded-full">
                <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Erreur de chargement</h2>
            <p className="text-slate-600">{message}</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
    );
}
