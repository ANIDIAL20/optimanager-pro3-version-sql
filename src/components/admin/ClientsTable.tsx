'use client';

import { useState, useMemo } from 'react';
import { ClientData, toggleClientStatus, deleteClient, resetClientPassword } from '@/app/actions/adminActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, ShieldCheck, Trash2, Calendar, KeyRound, Search, Users, Box, Truck, Store, Mail, Phone, Sparkles, RotateCw, CheckCircle2, XCircle, Snowflake, Clock, Filter, Pencil, ArrowUpDown } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import PlanManagementModal from '@/app/admin/components/PlanManagementModal';

// ============================================
// AVATAR COMPONENT
// ============================================
function ClientAvatar({ name, email }: { name?: string; email: string }) {
    const initials = (name || email).slice(0, 2).toUpperCase();
    const colors = [
        'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 
        'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const colorIndex = email.charCodeAt(0) % colors.length;
    
    return (
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm", colors[colorIndex])}>
            {initials}
        </div>
    );
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================
function StatusBadge({ status, isExpired }: { status: string; isExpired: boolean }) {
    if (status === 'active' && !isExpired) {
        return (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 gap-1">
                <CheckCircle2 size={12} /> Actif
            </Badge>
        );
    }
    if (status === 'frozen') {
        return (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1">
                <Snowflake size={12} /> Gelé
            </Badge>
        );
    }
    if (isExpired) {
        return (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 gap-1">
                <Clock size={12} /> Expiré
            </Badge>
        );
    }
    return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-200 gap-1">
            <XCircle size={12} /> Suspendu
        </Badge>
    );
}

// ============================================
// PLAN TYPE BADGE
// ============================================
function PlanBadge({ plan }: { plan: string }) {
    if (plan === 'yearly') {
        return <Badge className="bg-purple-100 text-purple-700 text-[10px] gap-1"><Sparkles size={10} /> Annuel</Badge>;
    }
    if (plan === 'monthly') {
        return <Badge className="bg-blue-100 text-blue-700 text-[10px] gap-1"><RotateCw size={10} /> Mensuel</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1"><Clock size={10} /> Essai</Badge>;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ClientsTable({ clients }: { clients: ClientData[] }) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');

    // Modal State
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

    // Password Reset State
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [resetClientId, setResetClientId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    // Filtered & Searched Clients
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const matchesSearch = 
                (client.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                client.email.toLowerCase().includes(searchQuery.toLowerCase());
            
            const isExpired = new Date(client.subscriptionEndDate) < new Date();
            
            if (filterStatus === 'all') return matchesSearch;
            if (filterStatus === 'active') return matchesSearch && client.status === 'active' && !isExpired;
            if (filterStatus === 'suspended') return matchesSearch && client.status === 'suspended';
            if (filterStatus === 'expired') return matchesSearch && isExpired;
            return matchesSearch;
        });
    }, [clients, searchQuery, filterStatus]);

    // Stats
    const stats = useMemo(() => {
        const active = clients.filter(c => c.status === 'active' && new Date(c.subscriptionEndDate) >= new Date()).length;
        const expired = clients.filter(c => new Date(c.subscriptionEndDate) < new Date()).length;
        const suspended = clients.filter(c => c.status === 'suspended').length;
        return { total: clients.length, active, expired, suspended };
    }, [clients]);

    const handleOpenPlanModal = (client: ClientData) => {
        setSelectedClient(client);
        setIsPlanModalOpen(true);
    };

    const handleClosePlanModal = () => {
        setIsPlanModalOpen(false);
    };

    const handleUpdate = () => {
        router.refresh();
    };

    const handleDelete = async (uid: string, email: string) => {
        const confirmed = confirm(
            `⚠️ SUPPRESSION DÉFINITIVE ⚠️\n\n` +
            `Client: ${email}\n\n` +
            `Cette action est IRRÉVERSIBLE!`
        );

        if (!confirmed) return;

        setLoadingId(uid);
        try {
            const res = await deleteClient(uid);
            setLoadingId(null);
            if (res.success) {
                toast.success('Client supprimé avec succès!');
                router.refresh();
            } else {
                toast.error(res.error || 'Erreur lors de la suppression');
            }
        } catch (error: any) {
            setLoadingId(null);
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const openResetPassword = (uid: string) => {
        setResetClientId(uid);
        setNewPassword('');
        setIsResetOpen(true);
    };

    const confirmResetPassword = async () => {
        if (!resetClientId || !newPassword) return;
        setIsResetting(true);
        const res = await resetClientPassword(resetClientId, newPassword);
        setIsResetting(false);
        if (res.success) {
            toast.success(res.message);
            setIsResetOpen(false);
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-3">
                <button 
                    onClick={() => setFilterStatus('all')}
                    className={cn("p-3 rounded-lg border text-left transition-all", filterStatus === 'all' ? "bg-slate-100 border-slate-300" : "bg-white hover:bg-slate-50")}
                >
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                    <p className="text-xs text-slate-500 uppercase">Total</p>
                </button>
                <button 
                    onClick={() => setFilterStatus('active')}
                    className={cn("p-3 rounded-lg border text-left transition-all", filterStatus === 'active' ? "bg-emerald-50 border-emerald-300" : "bg-white hover:bg-emerald-50")}
                >
                    <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                    <p className="text-xs text-emerald-600 uppercase">Actifs</p>
                </button>
                <button 
                    onClick={() => setFilterStatus('expired')}
                    className={cn("p-3 rounded-lg border text-left transition-all", filterStatus === 'expired' ? "bg-amber-50 border-amber-300" : "bg-white hover:bg-amber-50")}
                >
                    <p className="text-2xl font-bold text-amber-600">{stats.expired}</p>
                    <p className="text-xs text-amber-600 uppercase">Expirés</p>
                </button>
                <button 
                    onClick={() => setFilterStatus('suspended')}
                    className={cn("p-3 rounded-lg border text-left transition-all", filterStatus === 'suspended' ? "bg-red-50 border-red-300" : "bg-white hover:bg-red-50")}
                >
                    <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
                    <p className="text-xs text-red-600 uppercase">Suspendus</p>
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
                <Search size={18} className="text-slate-400 ml-2" />
                <Input 
                    placeholder="Rechercher par nom ou email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0"
                />
                {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>Effacer</Button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-[300px] font-bold text-slate-700">Client</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Statut</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Plan</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Quotas</TableHead>
                            <TableHead className="font-bold text-slate-700">Expiration</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={32} className="opacity-20" />
                                        <p>{searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucun client trouvé'}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClients.map((client) => {
                                const isExpired = new Date(client.subscriptionEndDate) < new Date();

                                return (
                                    <TableRow key={client.uid} className={cn(
                                        "transition-all hover:bg-slate-50/50",
                                        loadingId === client.uid && 'opacity-50 pointer-events-none',
                                        isExpired && 'bg-red-50/30'
                                    )}>
                                        {/* Client Info */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <ClientAvatar name={client.displayName} email={client.email} />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 text-sm">{client.displayName || 'Sans nom'}</span>
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Mail size={12} />
                                                        <span className="text-xs truncate max-w-[180px]" title={client.email}>{client.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <StatusBadge status={client.status} isExpired={isExpired} />
                                            </div>
                                        </TableCell>

                                        {/* Plan */}
                                        <TableCell className="text-center">
                                             <div className="flex justify-center">
                                                <PlanBadge plan={client.plan} />
                                             </div>
                                        </TableCell>

                                        {/* Quotas */}
                                        <TableCell>
                                            <div className="flex justify-center gap-3 text-xs">
                                                <div title="Produits" className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100">
                                                    <Box size={12} />
                                                    <span className="font-medium">{client.quotas?.maxProducts && client.quotas.maxProducts >= 10000 ? '∞' : client.quotas?.maxProducts || 50}</span>
                                                </div>
                                                <div title="Clients" className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
                                                    <Users size={12} />
                                                    <span className="font-medium">{client.quotas?.maxClients && client.quotas.maxClients >= 10000 ? '∞' : client.quotas?.maxClients || 20}</span>
                                                </div>
                                                <div title="Fournisseurs" className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-100">
                                                    <Truck size={12} />
                                                    <span className="font-medium">{client.quotas?.maxSuppliers && client.quotas.maxSuppliers >= 10000 ? '∞' : client.quotas?.maxSuppliers || 10}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Expiration */}
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className={cn("flex items-center gap-1.5 text-sm font-medium", isExpired ? 'text-red-700' : 'text-slate-700')}>
                                                    <Calendar size={14} />
                                                    {client.subscriptionEndDate && client.subscriptionEndDate !== 'N/A'
                                                        ? format(new Date(client.subscriptionEndDate), 'dd MMM yyyy', { locale: fr })
                                                        : 'Illimité'}
                                                </div>
                                                {client.subscriptionEndDate && client.subscriptionEndDate !== 'N/A' && (
                                                    <span className={cn("text-[10px] ml-5", isExpired ? "text-red-500 font-semibold" : "text-slate-400")}>
                                                        {isExpired ? 'Expiré ' : ''}{formatDistanceToNow(new Date(client.subscriptionEndDate), { addSuffix: true, locale: fr })}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel className="text-xs text-slate-500">Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleOpenPlanModal(client)}>
                                                        <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" />
                                                        Gérer le compte
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openResetPassword(client.uid)}>
                                                        <KeyRound className="mr-2 h-4 w-4" />
                                                        Réinitialiser MdP
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDelete(client.uid, client.email)} 
                                                        className="text-red-600 focus:bg-red-50"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Plan Management Modal */}
            {selectedClient && (
                <PlanManagementModal
                    client={selectedClient}
                    isOpen={isPlanModalOpen}
                    onClose={handleClosePlanModal}
                    onUpdate={handleUpdate}
                />
            )}

            {/* Reset Password Dialog */}
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen} modal={false}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                        <DialogDescription>
                            Entrez le nouveau mot de passe pour ce client.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="new-password">Nouveau mot de passe</Label>
                        <Input
                            id="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-2"
                            placeholder="Minimum 6 caractères"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetOpen(false)}>Annuler</Button>
                        <Button onClick={confirmResetPassword} disabled={isResetting || !newPassword}>
                            {isResetting && <BrandLoader size="sm" className="mr-2" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
