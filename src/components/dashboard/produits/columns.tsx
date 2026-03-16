"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
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
import { useToast } from "@/hooks/use-toast";
import { deleteProduct } from "@/app/actions/products-actions";
import { BrandLoader } from '@/components/ui/loader-brand';
import { useDeleteProduct } from "@/hooks/use-products";

// Extend Product type for table display with optional populated fields
export type ProductWithRelations = ProductType & {
    marque?: string;      // Populated brand name (if joined)
    categorie?: string;   // Populated category name (if joined)
};

export const columns: ColumnDef<ProductWithRelations>[] = [
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
            return (
                <div className="font-medium text-slate-700">
                    {product.marqueNom || "-"}
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
            const price = Number(row.getValue("prixVente") || 0);
            return (
                <div className="font-semibold text-slate-900">
                    {`${price.toFixed(2)} MAD`}
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row, table }) => {
            const product = row.original;
            // @ts-ignore
            const onDelete = table.options.meta?.deleteProduct;

            return <ProductActions product={product} onDelete={onDelete} />;
        },
    },
];

// Separate component for actions to use hooks
function ProductActions({ product, onDelete }: { product: ProductWithRelations, onDelete?: (id: string) => void }) {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const { toast } = useToast();

    const { mutateAsync: deleteProductAsync } = useDeleteProduct();

    const handleDelete = async () => {
        setIsDeleting(true);
        startTransition(async () => {
            try {
                // Close dialog immediately for better UX
                setShowDeleteDialog(false);

                // ✅ OPTIMISTIC UPDATE
                if (onDelete) {
                    onDelete(product.id.toString());
                }

                await deleteProductAsync(product.id.toString());
                
                // router.refresh(); // No longer necessary since useDeleteProduct handles cache invalidation

            } catch (error: any) {
                console.error("Error deleting product:", error);
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

            {/* @ts-ignore - modal prop exists but not in types */}
            <AlertDialog modal={false} open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action ne peut pas être annulée. Le produit "<span className="font-semibold text-slate-900">{product.nomProduit}</span>" sera définitivement
                            supprimé de votre inventaire.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
