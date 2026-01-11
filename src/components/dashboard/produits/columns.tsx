"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, Loader2 } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Product as ProductType } from "@/lib/types";
import { useFirestore, useFirebase } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { deleteProduct } from "@/app/actions/products-actions";

// Extend Product type for table display with optional populated fields
export type Product = ProductType & {
    marque?: string;      // Populated brand name (if joined)
    categorie?: string;   // Populated category name (if joined)
};

export const columns: ColumnDef<Product>[] = [
    {
        accessorKey: "reference",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Référence
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return (
                <div className="font-bold text-slate-900">
                    {row.getValue("reference")}
                </div>
            );
        },
    },
    {
        accessorKey: "nomProduit",
        header: "Nom",
        cell: ({ row }) => {
            return (
                <div className="font-medium text-slate-700">
                    {row.getValue("nomProduit") || "-"}
                </div>
            );
        },
    },
    {
        accessorKey: "marque",
        header: "Marque",
        cell: ({ row }) => {
            const product = row.original;
            // Show populated marque if available, otherwise show marqueId or "-"
            const displayValue = product.marque || product.marqueId || "-";
            return (
                <div className="font-medium text-slate-700">
                    {displayValue}
                </div>
            );
        },
    },
    {
        accessorKey: "categorie",
        header: "Catégorie",
        cell: ({ row }) => {
            const product = row.original;
            // Show populated categorie if available, otherwise show categorieId or "-"
            const type = product.categorie || product.categorieId || "-";
            const colorMap: Record<string, string> = {
                "Montures": "bg-purple-100 text-purple-700 border-purple-200",
                "Verres": "bg-blue-100 text-blue-700 border-blue-200",
                "Lentilles": "bg-green-100 text-green-700 border-green-200",
                "Accessoires": "bg-teal-100 text-teal-700 border-teal-200",
            };
            const color = colorMap[type] || "bg-slate-100 text-slate-700 border-slate-200";

            return type && type !== "-" ? (
                <Badge variant="outline" className={color}>
                    {type}
                </Badge>
            ) : (
                <span className="text-slate-400">-</span>
            );
        },
    },
    {
        accessorKey: "quantiteStock",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Quantité
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const qty = row.getValue("quantiteStock") as number;
            return (
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            "font-bold",
                            qty < 3 ? "text-red-600" : qty < 10 ? "text-orange-600" : "text-green-600"
                        )}
                    >
                        {qty}
                    </span>
                    {qty < 3 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                            Critique
                        </Badge>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "prixVente",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Prix (MAD)
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const price = row.getValue("prixVente") as number;
            return (
                <div className="font-semibold text-slate-900">
                    {price ? `${price.toFixed(2)} MAD` : "-"}
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const product = row.original;

            return <ProductActions product={product} />;
        },
    },
];

// Separate component for actions to use hooks
function ProductActions({ product }: { product: Product }) {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useFirebase();

    const handleDelete = async () => {
        // if (!firestore || !user) return; // Server action handles auth/user check internally 
        // But we rely on session. `deleteProduct` is secureAction.
        
        setIsDeleting(true);
        startTransition(async () => {
            try {
                const result = await deleteProduct(product.id);

                if (result.success) {
                    toast({
                        title: "Produit supprimé",
                        description: `Le produit "${product.nomProduit}" a été supprimé avec succès.`,
                    });
                     // Close dialog
                    setShowDeleteDialog(false);
                    // Refresh data
                    router.refresh();
                } else {
                     throw new Error(result.error);
                }

            } catch (error: any) {
                console.error("Error deleting product:", error);
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: error.message || "Une erreur s'est produite lors de la suppression.",
                });
            } finally {
                setIsDeleting(false);
            }
        });
    };

    const isBusy = isDeleting || isPending;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(`/produits/${product.id}`)}>
                        Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/produits/${product.id}/edit`)}>
                        Modifier produit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/produits/${product.id}?action=edit-stock`)}>
                        Modifier stock
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Cela supprimera définitivement le produit{" "}
                            <span className="font-semibold text-slate-900">"{product.nomProduit}"</span>{" "}
                            (Réf: {product.reference}) de la base de données.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={isBusy}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
