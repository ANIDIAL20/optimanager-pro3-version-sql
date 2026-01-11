"use client";

import * as React from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, Eye, Trash2, Check, Package, Box, Search, Droplets, Receipt, Truck } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SensitiveData } from "@/components/ui/sensitive-data";
import { SupplierOrder } from "@/app/actions/supplier-orders-actions";

// Extended type for UI logic if needed
export type SupplierOrderUI = SupplierOrder & {
    amountPaid?: number; // Optional until implemented in backend
};

// Utility
const safeNum = (num: number | undefined) => num || 0;

export const columns: ColumnDef<SupplierOrderUI>[] = [
    {
        id: "type",
        header: "",
        cell: ({ row }) => {
            // Logic to determine type. For now, defaulting to 'Box' (Montures) 
            // or checking items if possible. 
            // Ideally this comes from a 'type' field in the order.
            // Using a heuristic or default:
            return <Box className="h-4 w-4 text-purple-500" title="Montures / Stock" />;
        },
    },
    {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => {
            const date = row.original.createdAt ? new Date(row.original.createdAt) : null;
            return (
                <div className="text-sm text-slate-700">
                    {date && !isNaN(date.getTime())
                        ? format(date, "dd/MM/yyyy", { locale: fr })
                        : "-"}
                </div>
            );
        },
    },
    {
        accessorKey: "supplierName",
        header: "Fournisseur",
        cell: ({ row }) => {
            const name = row.original.supplierName || "Fournisseur Inconnu";
            const phone = row.original.supplierPhone;

            return (
                <div>
                    <div className="font-medium text-slate-900">{name}</div>
                    {phone && (
                        <div className="text-xs text-slate-500">
                            Tél: {phone}
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "status",
        header: "État Réception",
        cell: ({ row }) => {
            const status = row.original.status;

            if (status === 'received') {
                return (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" /> Reçue
                    </Badge>
                );
            }
            // Default pending
            return (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                    <Truck className="h-3 w-3 mr-1" /> Commandée
                </Badge>
            );
        },
    },
    {
        accessorKey: "totalAmount",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Total
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const total = safeNum(row.original.totalAmount);
            return (
                <div className="font-bold text-slate-900">
                    <SensitiveData value={total} type="currency" />
                </div>
            );
        },
    },
    {
        id: "paid",
        header: "Payé",
        cell: ({ row }) => {
            const paid = safeNum(row.original.amountPaid);
            return (
                <div className="font-semibold text-green-700">
                    <SensitiveData value={paid} type="currency" />
                </div>
            );
        },
    },
    {
        id: "reste",
        header: "Reste",
        cell: ({ row }) => {
            const total = safeNum(row.original.totalAmount);
            const paid = safeNum(row.original.amountPaid);
            const reste = total - paid;
            const isPaid = reste <= 0.01;

            return (
                <div className={cn(
                    "font-semibold",
                    isPaid ? "text-slate-400" : "text-red-600"
                )}>
                    <SensitiveData value={reste} type="currency" />
                </div>
            );
        },
    },
    {
        id: "paymentStatus",
        header: "Statut Paiement",
        cell: ({ row }) => {
            const total = safeNum(row.original.totalAmount);
            const paid = safeNum(row.original.amountPaid);
            const reste = total - paid;

            let badgeText = "Impayé";
            let badgeClass = "bg-red-100 text-red-700 border-red-200";

            if (reste <= 0.01 && total > 0) {
                badgeText = "Payé";
                badgeClass = "bg-green-100 text-green-700 border-green-200";
            } else if (paid > 0) {
                badgeText = "Avance";
                badgeClass = "bg-orange-100 text-orange-700 border-orange-200";
            }

            return (
                <Badge variant="outline" className={cn("rounded-full", badgeClass)}>
                    {badgeText}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            return <OrderActions order={row.original} />;
        },
    },
];

// Actions Component
import { useToast } from "@/hooks/use-toast";
import { confirmOrderReception, deleteSupplierOrder } from "@/app/actions/supplier-orders-actions";
import { useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";

function OrderActions({ order }: { order: SupplierOrderUI }) {
    const { user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = React.useState(false);

    const handleConfirmReception = async () => {
        if (!user || !order.id) return;
        setIsProcessing(true);
        try {
            const res = await confirmOrderReception(user.uid, order.id);
            if (res.success) {
                toast({ title: "Succès", description: res.message });
                router.refresh();
            } else {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!user || !order.id || !confirm("Supprimer cette commande ?")) return;
        const res = await deleteSupplierOrder(user.uid, order.id);
        if (res.success) {
            toast({ title: "Succès", description: res.message });
            router.refresh();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Ouvrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { }}>
                    <Eye className="mr-2 h-4 w-4" /> Voir Détails
                </DropdownMenuItem>

                {order.status !== 'received' && (
                    <DropdownMenuItem onClick={handleConfirmReception} disabled={isProcessing}>
                        <Check className="mr-2 h-4 w-4 text-green-600" /> Marquer Reçue
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => { }}>
                    <Receipt className="mr-2 h-4 w-4" /> Ajouter Paiement
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
