'use client';

import { useState } from 'react';
import { ClientData, toggleClientStatus, extendSubscription, deleteClient, resetClientPassword } from '@/app/actions/adminActions';
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
import { MoreHorizontal, ShieldCheck, Power, Clock, Trash2, Calendar, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { PlanManagementModal } from '@/app/admin/components/PlanManagementModal';

export default function ClientsTable({ clients }: { clients: ClientData[] }) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Modal State
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

    // Password Reset State
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [resetClientId, setResetClientId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const handleOpenPlanModal = (client: ClientData) => {
        setSelectedClient(client);
        setIsPlanModalOpen(true);
    };

    const handleDelete = async (uid: string, email: string) => {
        // Enhanced confirmation dialog
        const confirmed = confirm(
            `⚠️ SUPPRESSION COMPLÈTE ⚠️\n\n` +
            `Vous êtes sur le point de supprimer DÉFINITIVEMENT:\n\n` +
            `✓ Le compte: ${email}\n` +
            `✓ Toutes les données associées dans PostgreSQL\n\n` +
            `Cette action est IRRÉVERSIBLE!\n\n` +
            `Cliquez OK pour confirmer.`
        );

        if (!confirmed) return;

        setLoadingId(uid);

        try {
            // Delete user and all associated data via server action
            // The server action handles cascading deletes in PostgreSQL
            toast.info('Suppression du compte et des données...');
            const res = await deleteClient(uid);

            setLoadingId(null);

            if (res.success) {
                toast.success('✅ Client et toutes ses données supprimés avec succès!');
                router.refresh();
            } else {
                toast.error(res.error || 'Erreur lors de la suppression');
            }
        } catch (error: any) {
            console.error('Delete error:', error);
            setLoadingId(null);
            toast.error(`Erreur: ${error.message || 'Échec de la suppression'}`);
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
            setResetClientId(null);
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="rounded-md border bg-white shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Revenus Est.</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((client) => {
                        const isExpired = new Date(client.subscriptionEndDate) < new Date();
                        const isFrozen = client.status === 'frozen';

                        return (
                            <TableRow key={client.uid} className={loadingId === client.uid ? 'opacity-50 pointer-events-none' : ''}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{client.displayName || client.email}</span>
                                        <span className="text-xs text-muted-foreground">{client.email}</span>
                                        {client.phoneNumber && <span className="text-xs text-muted-foreground">{client.phoneNumber}</span>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`capitalize ${client.plan === 'yearly' ? 'border-purple-200 bg-purple-50 text-purple-700' : ''}`}>
                                        {client.plan === 'trial' ? 'Essai' : client.plan}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={client.status === 'active' ? 'default' : (isFrozen ? 'secondary' : 'destructive')}
                                        className={client.status === 'active' ? 'bg-green-600 hover:bg-green-700' : (isFrozen ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : '')}>
                                        {client.status === 'active' ? 'Actif' : (isFrozen ? 'Gelé' : 'Suspendu')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className={`flex items-center gap-2 ${isExpired ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                        <Calendar size={14} />
                                        <span className="text-sm">
                                            {client.subscriptionEndDate && client.subscriptionEndDate !== 'N/A'
                                                ? format(new Date(client.subscriptionEndDate), 'dd MMM yyyy', { locale: fr })
                                                : 'Illimité'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="font-semibold text-gray-700">{client.revenue} MAD</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                            <DropdownMenuItem onClick={() => handleOpenPlanModal(client)}>
                                                <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" />
                                                Gérer le compte
                                            </DropdownMenuItem>

                                            <DropdownMenuItem onClick={() => openResetPassword(client.uid)}>
                                                <KeyRound className="mr-2 h-4 w-4" />
                                                Réinitialiser MdP
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleDelete(client.uid, client.email)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
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

            {/* Plan Management Modal */}
            {selectedClient && (
                <PlanManagementModal
                    client={selectedClient}
                    open={isPlanModalOpen}
                    onOpenChange={setIsPlanModalOpen}
                />
            )}

            {/* Reset Password Dialog */}
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen} modal={false}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                        <DialogDescription>
                            Entrez le nouveau mot de passe pour ce client. L'ancien sera écrasé.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-password" className="text-right">
                                Nouveau MdP
                            </Label>
                            <Input
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="col-span-3"
                                placeholder="Nouveau mot de passe"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetOpen(false)}>Annuler</Button>
                        <Button onClick={confirmResetPassword} disabled={isResetting || !newPassword}>
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
