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
            return <Box className="h-4 w-4 text-purple-500" />;
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
            const reste = safeNum(row.original.resteAPayer);
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
import { useRouter } from "next/navigation";
import { SupplierPaymentDialog } from "./supplier-payment-dialog";

// Define component inside or export
function OrderActions({ order }: { order: SupplierOrderUI }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [paymentOpen, setPaymentOpen] = React.useState(false);

    const handleConfirmReception = async () => {
        if (!order.id) return;
        setIsProcessing(true);
        try {
            const res = await confirmOrderReception(order.id);
            if (res?.success) {
                toast({ 
                    title: "Succès", 
                    description: res.message, 
                    className: "bg-green-600 text-white border-none" 
                });
                router.refresh();
            } else {
                toast({ 
                    title: "Erreur", 
                    description: res?.error || "Erreur inconnue", 
                    variant: "destructive" 
                });
            }
        } catch (e) {
            toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!order.id || !confirm("Supprimer cette commande ?")) return;
        
        try {
            const res = await deleteSupplierOrder(order.id);
            if (res?.success) {
                toast({ title: "Succès", description: res.message });
                router.refresh();
            } else {
                toast({ title: "Erreur", description: res?.error, variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
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
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { }}>
                        <Eye className="mr-2 h-4 w-4" /> Voir Détails
                    </DropdownMenuItem>

                    {order.status !== 'received' && order.status !== 'REÇU' && (
                        <DropdownMenuItem onClick={handleConfirmReception} disabled={isProcessing}>
                            <Check className="mr-2 h-4 w-4 text-green-600" /> Marquer Reçue
                        </DropdownMenuItem>
                    )}

                    {order.resteAPayer > 0 && (
                        <DropdownMenuItem onClick={() => setPaymentOpen(true)}>
                            <Receipt className="mr-2 h-4 w-4" /> Ajouter Paiement
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {paymentOpen && (
                <SupplierPaymentDialog
                    open={paymentOpen}
                    onOpenChange={setPaymentOpen}
                    supplierId={order.supplierId || ''}
                    supplierName={order.supplierName}
                    orderId={order.id}
                    maxAmount={order.resteAPayer}
                />
            )}
        </>
    );
}

// Export the component as default or part of module if needed, but here likely just used in 'columns'
// columns definition uses <OrderActions ... /> which refers to this function.
// Since 'columns' is exported above, keeping this function in the same file is fine if it's in scope.
// However, 'columns' array is defined using it. 
// I need to make sure OrderActions is available to columns.
// Currently 'columns' is defined before 'OrderActions'. That's a problem in JS/TS regarding hoisting if const is used?
// Function declarations are hoisted. 
// But 'columns' is a const export. 
// I should move OrderActions ABOVE columns or use a forward reference?
// In the original file, it was defined AFTER columns. 
// "export const columns = ..." uses OrderActions.
// If OrderActions is a function, it should be hoisted.
// But typescript might complain if I don't export it or define it before.
// I'll leave position as is (at bottom) provided it's a function declaration `function OrderActions...`.

