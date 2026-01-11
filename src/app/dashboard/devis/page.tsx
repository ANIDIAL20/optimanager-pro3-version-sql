'use client';

import * as React from 'react';
import { getDevis, deleteDevis, Devis } from '@/app/actions/devis-actions';
import { getPrintData } from '@/app/actions/print-actions';
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
import { FileText, Plus, Trash2, Eye, Printer, Search, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { CreateDevisModal } from './_components/create-devis-modal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useReactToPrint } from 'react-to-print';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';

export default function DevisPage() {
    const { toast } = useToast();
    const router = useRouter();

    const [devisList, setDevisList] = React.useState<Devis[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');

    // Print State
    const [printData, setPrintData] = React.useState<any>(null);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const componentRef = React.useRef<HTMLDivElement>(null);

    // Setup ReactToPrint
    const handleReactToPrint = useReactToPrint({
        contentRef: componentRef,
        onAfterPrint: () => {
            setIsPrinting(false);
            setPrintData(null); // Cleanup memory
        },
        onPrintError: () => {
            setIsPrinting(false);
            toast({ title: 'Erreur', description: "L'impression a échoué", variant: "destructive" });
        }
    });

    // Trigger print when data is ready
    React.useEffect(() => {
        if (printData && isPrinting) {
            // Small delay to ensure render of the dynamic content
            const timer = setTimeout(() => {
                handleReactToPrint();
            }, 500); // Increased delay slightly to be safe
            return () => clearTimeout(timer);
        }
    }, [printData, isPrinting, handleReactToPrint]);

    const handlePrint = async (devisId: string) => {
        setIsPrinting(true);
        toast({ title: 'Préparation du document...', description: 'Veuillez patienter un instant.' });

        const result = await getPrintData(devisId, 'devis');

        if (result.success) {
            setPrintData(result.data);
            // The useEffect will trigger print when state updates
        } else {
            setIsPrinting(false);
            toast({
                title: 'Erreur',
                description: result.error || "Impossible de charger les données du devis",
                variant: 'destructive',
            });
        }
    };


    // Load devis
    const loadDevis = React.useCallback(async () => {
        setIsLoading(true);
        const result = await getDevis();
        if (result.success) {
            setDevisList(result.devis);
        }
        setIsLoading(false);
    }, []);

    React.useEffect(() => {
        loadDevis();
    }, [loadDevis]);

    // Delete devis
    const handleDelete = async (devisId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

        const result = await deleteDevis(devisId);
        if (result.success) {
            toast({
                title: '✅ Succès',
                description: result.message,
            });
            loadDevis();
        } else {
            toast({
                title: '❌ Erreur',
                description: result.error,
                variant: 'destructive',
            });
        }
    };

    const getStatusBadge = (status: Devis['status']) => {
        switch (status) {
            case 'EN_ATTENTE':
                return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">En Attente</Badge>;
            case 'VALIDE':
                return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Validé</Badge>;
            case 'REFUSE':
                return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Refusé</Badge>;
            case 'TRANSFORME':
                return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Transformé</Badge>;
            default:
                return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Autre</Badge>;
        }
    };

    // Filter devis
    const filteredDevis = React.useMemo(() => {
        return devisList.filter(devis => {
            const matchesSearch =
                devis.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (devis.id && devis.id.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' || devis.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [devisList, searchTerm, statusFilter]);

    // Stats
    const stats = React.useMemo(() => {
        return {
            total: devisList.length,
            pending: devisList.filter(d => d.status === 'EN_ATTENTE').length,
            validated: devisList.filter(d => d.status === 'VALIDE' || d.status === 'TRANSFORME').length,
            totalValue: devisList.reduce((acc, d) => acc + d.totalTTC, 0)
        };
    }, [devisList]);

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header Section (Aligned with Ventes) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Mes Devis
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Gérez vos devis et propositions commerciales
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <CreateDevisModal onSuccess={loadDevis}>
                        <Button className="gap-2 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                            <Plus className="h-4 w-4" />
                            Nouveau Devis
                        </Button>
                    </CreateDevisModal>
                </div>
            </div>

            {/* Stats Cards (Aligned with Ventes) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Total Devis</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{stats.total}</h3>
                        <p className="text-sm text-slate-500">
                            Valeur: {stats.totalValue.toFixed(2)} DH
                        </p>
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
                        <h3 className="text-3xl font-bold text-slate-900">{stats.pending}</h3>
                        <p className="text-sm text-slate-500">Devis en attente de réponse</p>
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
                        <h3 className="text-3xl font-bold text-slate-900">{stats.validated}</h3>
                        <p className="text-sm text-slate-500">Devis acceptés et signés</p>
                    </div>
                </SpotlightCard>
            </div>

            {/* Filter Bar (Aligned with Ventes) */}
            <SpotlightCard className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher par client ou n° devis..."
                            className="pl-10 bg-white border-slate-200 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[200px] bg-white">
                            <SelectValue placeholder="Filtrer par statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="EN_ATTENTE">En Attente</SelectItem>
                            <SelectItem value="VALIDE">Validé</SelectItem>
                            <SelectItem value="TRANSFORME">Transformé</SelectItem>
                            <SelectItem value="REFUSE">Refusé</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </SpotlightCard>

            {/* Table */}
            {filteredDevis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border rounded-lg bg-white/50 border-dashed">
                    <FileText className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-900">Aucun devis trouvé</p>
                    <p className="text-sm mb-6">Modifiez vos filtres ou créez un nouveau devis</p>
                    <CreateDevisModal onSuccess={loadDevis}>
                        <Button variant="outline">
                            Créer un devis
                        </Button>
                    </CreateDevisModal>
                </div>
            ) : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="font-medium text-slate-900">N° / Date</TableHead>
                                <TableHead className="font-medium text-slate-900">Client</TableHead>
                                <TableHead className="font-medium text-slate-900">Téléphone</TableHead>
                                <TableHead className="text-right font-medium text-slate-900">Total TTC</TableHead>
                                <TableHead className="font-medium text-slate-900">Statut</TableHead>
                                <TableHead className="text-right font-medium text-slate-900">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDevis.map((devis) => (
                                <TableRow
                                    key={devis.id}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <TableCell>
                                        <div className="font-mono font-medium text-slate-900">#{devis.id?.slice(0, 8).toUpperCase()}</div>
                                        <div className="text-xs text-slate-500">{new Date(devis.createdAt).toLocaleDateString('fr-FR')}</div>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                                        <Link href={`/dashboard/devis/${devis.id}`}>
                                            {devis.clientName}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-slate-600">{devis.clientPhone}</TableCell>
                                    <TableCell className="text-right font-bold text-slate-900">
                                        {devis.totalTTC.toFixed(2)} DH
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(devis.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                            >
                                                <Link href={`/dashboard/devis/${devis.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePrint(devis.id!)}
                                                disabled={isPrinting}
                                                className="h-8 w-8 p-0 hover:bg-slate-100"
                                                title="Imprimer"
                                            >
                                                {isPrinting && printData?.document?.id === devis.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                                ) : (
                                                    <Printer className="h-4 w-4 text-slate-600" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(devis.id!)}
                                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Hidden Print Component - Single Instance */}
            <div style={{ display: 'none' }}>
                <div ref={componentRef}>
                    {printData && (
                        <PrintDocumentTemplate type="devis" data={printData} />
                    )}
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>

            <Skeleton className="h-16 w-full rounded-xl" />

            <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        </div>
    );
}
