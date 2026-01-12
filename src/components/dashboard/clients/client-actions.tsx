"use client";

import { useState } from "react";
import { Copy, MoreHorizontal, Pencil, Trash, User, Calendar, Eye, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { toast } from "sonner";
import { deleteClient } from "@/app/actions/clients-actions";
import { useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { Client } from "./columns";

interface ClientActionsProps {
    client: Client;
}

export function ClientActions({ client }: ClientActionsProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useFirebase();
    const router = useRouter();

    const handleDelete = async () => {
        if (!user || !confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

        try {
            setIsLoading(true);
            // ✅ FIX: secureAction injects userId automatically, only pass clientId
            const result = await deleteClient(client.id);
            
            if (result.success) {
                toast({
                    title: 'Client supprimé',
                    description: result.message,
                });
                router.push('/dashboard/clients');
            } else {
                toast({
                    title: 'Erreur',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Erreur',
                description: 'Une erreur est survenue lors de la suppression.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            setOpen(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="bg-blue-50 text-blue-700 focus:text-blue-700 focus:bg-blue-100 cursor-pointer">
                        <Link href={`/clients/${client.id}?tab=prescriptions`}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Nouvelle Visite
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={`/clients/${client.id}?tab=overview`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir Dossier
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/clients/${client.id}?tab=purchase-history`}>
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Historique d'achat
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                        onSelect={(e) => {
                            e.preventDefault();
                            setOpen(true);
                        }}
                    >
                        Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Cela supprimera définitivement le client
                            <span className="font-semibold text-slate-900"> {client.prenom} {client.nom}</span> et tout son historique.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? "Suppression..." : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
