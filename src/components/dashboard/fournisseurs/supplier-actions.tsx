"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Eye, Truck } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { deleteSupplier } from "@/app/actions/supplier-actions";
import { useRouter } from "next/navigation";
import type { Supplier } from "@/lib/types";
import { Wallet, PlusCircle } from "lucide-react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { SupplierPaymentForm } from "@/components/suppliers/payment-form";
import { SupplierOrderForm } from "@/components/suppliers/order-form";

interface SupplierActionsProps {
    supplierId: string;
    supplierName: string;
    variant?: "dropdown" | "header";
}

export function SupplierActions({ supplierId, supplierName, variant = "dropdown" }: SupplierActionsProps) {
    const [open, setOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async () => {
        try {
            setIsLoading(true);
            const result = await deleteSupplier(supplierId) as any;
            
            if (result?.success) {
                toast({
                    title: 'Fournisseur supprimé',
                    description: `Le fournisseur "${supplierName}" a été supprimé avec succès.`,
                });
                router.push('/suppliers');
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: result?.error || 'Erreur lors de la suppression.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Une erreur est survenue lors de la suppression.',
            });
        } finally {
            setIsLoading(false);
            setOpen(false);
        }
    };

    if (variant === "header") {
        return (
            <div className="flex gap-2">
                {/* Ajouter Commande */}
                <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-blue-200 hover:bg-blue-50 text-blue-700">
                            <PlusCircle className="mr-2 h-4 w-4" /> Commande
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Nouvelle Commande Fournisseur</DialogTitle>
                        </DialogHeader>
                        <SupplierOrderForm 
                            supplierId={supplierId} 
                            onSuccess={() => setOrderOpen(false)} 
                        />
                    </DialogContent>
                </Dialog>

                {/* Ajouter Paiement */}
                <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Wallet className="mr-2 h-4 w-4" /> Paiement
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Enregistrer un Paiement</DialogTitle>
                        </DialogHeader>
                        <SupplierPaymentForm 
                            supplierId={supplierId} 
                            onSuccess={() => setPaymentOpen(false)} 
                        />
                    </DialogContent>
                </Dialog>

                <Button variant="outline" asChild>
                    <Link href={`/suppliers/${supplierId}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" /> Modifier
                    </Link>
                </Button>
                <Button 
                    variant="destructive" 
                    onClick={() => setOpen(true)} 
                    disabled={isLoading}
                >
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </Button>

                {/* @ts-ignore - modal prop exists in Radix but sometimes missing in TS types */}
                <AlertDialog modal={false} open={open} onOpenChange={setOpen}>
                    <AlertDialogContent 
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => {
                            e.preventDefault();
                            document.body.style.pointerEvents = 'auto';
                            document.documentElement.style.pointerEvents = 'auto';
                        }}
                    >
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est irréversible. Le fournisseur "{supplierName}" sera définitivement supprimé.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete();
                                }}
                                disabled={isLoading}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isLoading ? 'Suppression...' : 'Supprimer'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/suppliers/${supplierId}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir détails
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/suppliers/${supplierId}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
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
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* @ts-ignore */}
            <AlertDialog modal={false} open={open} onOpenChange={setOpen}>
                <AlertDialogContent 
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => {
                        e.preventDefault();
                        document.body.style.pointerEvents = 'auto';
                        document.documentElement.style.pointerEvents = 'auto';
                    }}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le fournisseur "{supplierName}" sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isLoading ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
