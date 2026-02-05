'use client';

import * as React from 'react';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, Edit, Eye } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { toggleClientStatus, extendSubscription, deleteClient as serverDeleteClient } from '@/app/actions/adminActions';

interface ClientActionsProps {
    client: {
        uid: string;
        email: string;
        displayName?: string;
        status: 'active' | 'suspended';
    };
}

export function ClientActions({ client }: ClientActionsProps) {
    const [isPending, startTransition] = React.useTransition();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false); // New state for delete action
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const { toast } = useToast();
    const router = useRouter();


    // Toggle status (suspend/activate)
    const handleToggleStatus = async () => {
        setIsLoading(true);
        startTransition(async () => {
            try {
                const result = await toggleClientStatus(client.uid, client.status);
                if (result.success) {
                    toast({
                        title: 'Statut mis à jour',
                        description: result.message,
                    });
                    router.refresh();
                } else {
                    throw new Error(result.error);
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: error.message || 'Impossible de modifier le statut',
                });
            } finally {
                setIsLoading(false);
            }
        });
    };

    // Extend subscription
    const handleExtend = async (period: 'monthly' | 'yearly') => {
        setIsLoading(true);
        startTransition(async () => {
            try {
                const result = await extendSubscription(client.uid, period);
                if (result.success) {
                    toast({
                        title: 'Abonnement prolongé',
                        description: result.message,
                    });
                    router.refresh();
                } else {
                    throw new Error(result.error);
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: error.message || "Impossible de prolonger l'abonnement",
                });
            } finally {
                setIsLoading(false);
            }
        });
    };

    // Simplified deletion for SQL version
    const handleDeepDelete = async () => {
        setIsDeleting(true); // Use isDeleting for this action
        startTransition(async () => {
            try {
                // Call server action to delete Auth user and client profile
                // Note: The comprehensive delete of all related data should be handled by the server action via cascades or manual deletion in DB.
                const result = await serverDeleteClient(client.uid);

                if (result.success) {
                    toast({
                        title: 'Client supprimé',
                        description: 'Le client et ses données ont été supprimés.',
                    });
                    router.refresh();
                    setShowDeleteDialog(false);
                } else {
                    throw new Error(result.error);
                }

            } catch (error: any) {
                console.error('Delete error:', error);
                toast({
                    variant: 'destructive',
                    title: 'Erreur de suppression',
                    description: error.message || 'Impossible de supprimer le client.',
                });
            } finally {
                setIsDeleting(false); // Use isDeleting for this action
            }
        });
    };

    return (
        <>
            {/* DropdownMenu with modal={false} to prevent UI freeze */}
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading || isPending || isDeleting}>
                        {isLoading || isPending || isDeleting ? (
                            <BrandLoader size="xs" className="h-4 w-4 animate-spin" />
                        ) : (
                            <MoreHorizontal className="h-4 w-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions Client</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Toggle Status */}
                    <DropdownMenuItem onClick={handleToggleStatus} disabled={isLoading || isDeleting}>
                        {client.status === 'active' ? (
                            <>
                                <Eye className="mr-2 h-4 w-4" /> {/* Changed from Lock */}
                                <span>Suspendre</span>
                            </>
                        ) : (
                            <>
                                <Edit className="mr-2 h-4 w-4" /> {/* Changed from Unlock */}
                                <span>Activer</span>
                            </>
                        )}
                    </DropdownMenuItem>

                    {/* Extend Subscription */}
                    <DropdownMenuItem onClick={() => handleExtend('monthly')} disabled={isLoading || isDeleting}>
                        <Edit className="mr-2 h-4 w-4" /> {/* Changed from CalendarPlus */}
                        <span>Prolonger 1 mois</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleExtend('yearly')} disabled={isLoading || isDeleting}>
                        <Edit className="mr-2 h-4 w-4" /> {/* Changed from CalendarPlus */}
                        <span>Prolonger 1 an</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Delete Client */}
                    <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isLoading || isDeleting}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Supprimer le Client</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Dialog */}
            {/* @ts-ignore - modal prop exists but not in types */}
            <AlertDialog modal={false} open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                Cette action est <strong>IRRÉVERSIBLE</strong>.
                                Elle va supprimer définitivement :
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>Le compte utilisateur de <strong>{client.email}</strong></li>
                                <li>Tous les produits du magasin</li>
                                <li>Toutes les ventes et commandes</li>
                                <li>Tous les clients enregistrés</li>
                                <li>Tous les fichiers uploadés (logos, etc.)</li>
                                <li>Toutes les données Firestore associées</li>
                            </ul>
                            <p className="text-red-600 font-semibold mt-4">
                                ⚠️ Cette opération ne peut pas être annulée !
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading || isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeepDelete();
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <>
                                  {isDeleting && <BrandLoader size="xs" className="mr-2 inline-flex" />}
                                    Suppression...
                                </>
                            ) : (
                                'Oui, tout supprimer'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
