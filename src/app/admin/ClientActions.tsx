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
import { MoreHorizontal, Lock, Unlock, CalendarPlus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref as storageRef, listAll, deleteObject } from 'firebase/storage';
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
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();

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

    // Deep delete - Remove all tenant data
    const handleDeepDelete = async () => {
        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Service non disponible',
            });
            return;
        }

        setIsLoading(true);
        startTransition(async () => {
            try {
                const storage = getStorage();

                // Step 1: Delete Storage files
                try {
                    // Delete logos folder
                    const logosRef = storageRef(storage, `logos/${client.uid}`);
                    const logosList = await listAll(logosRef);
                    await Promise.all(logosList.items.map(item => deleteObject(item)));

                    // Delete users folder
                    const usersRef = storageRef(storage, `users/${client.uid}`);
                    const usersList = await listAll(usersRef);
                    await Promise.all(usersList.items.map(item => deleteObject(item)));
                } catch (storageError) {
                    // Storage might be empty or not exist, continue
                    console.warn('Storage deletion warning:', storageError);
                }

                // Step 2: Delete Firestore collections
                try {
                    // Delete products
                    const productsRef = collection(firestore, `stores/${client.uid}/products`);
                    const productsSnap = await getDocs(productsRef);
                    await Promise.all(productsSnap.docs.map(d => deleteDoc(d.ref)));

                    // Delete sales
                    const salesRef = collection(firestore, `stores/${client.uid}/sales`);
                    const salesSnap = await getDocs(salesRef);
                    await Promise.all(salesSnap.docs.map(d => deleteDoc(d.ref)));

                    // Delete clients
                    const clientsRef = collection(firestore, `stores/${client.uid}/clients`);
                    const clientsSnap = await getDocs(clientsRef);
                    await Promise.all(clientsSnap.docs.map(d => deleteDoc(d.ref)));

                    // Delete settings
                    const settingsRef = collection(firestore, `stores/${client.uid}/settings`);
                    const settingsSnap = await getDocs(settingsRef);
                    await Promise.all(settingsSnap.docs.map(d => deleteDoc(d.ref)));

                    // Delete prescriptions if exists
                    const prescriptionsRef = collection(firestore, `stores/${client.uid}/prescriptions`);
                    const prescriptionsSnap = await getDocs(prescriptionsRef);
                    await Promise.all(prescriptionsSnap.docs.map(d => deleteDoc(d.ref)));

                    // Delete store document itself
                    await deleteDoc(doc(firestore, `stores/${client.uid}`));

                } catch (firestoreError) {
                    console.warn('Firestore deletion warning:', firestoreError);
                }

                // Step 3: Call server action to delete Auth user and client profile
                const result = await serverDeleteClient(client.uid);

                if (result.success) {
                    toast({
                        title: 'Client supprimé',
                        description: 'Toutes les données du client ont été effacées avec succès.',
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
                setIsLoading(false);
            }
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading || isPending}>
                        {isLoading || isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <MoreHorizontal className="h-4 w-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions Client</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Toggle Status */}
                    <DropdownMenuItem onClick={handleToggleStatus} disabled={isLoading}>
                        {client.status === 'active' ? (
                            <>
                                <Lock className="mr-2 h-4 w-4" />
                                <span>Suspendre</span>
                            </>
                        ) : (
                            <>
                                <Unlock className="mr-2 h-4 w-4" />
                                <span>Activer</span>
                            </>
                        )}
                    </DropdownMenuItem>

                    {/* Extend Subscription */}
                    <DropdownMenuItem onClick={() => handleExtend('monthly')} disabled={isLoading}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        <span>Prolonger 1 mois</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleExtend('yearly')} disabled={isLoading}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        <span>Prolonger 1 an</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Delete Client */}
                    <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isLoading}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Supprimer le Client</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
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
                        <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeepDelete();
                            }}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
