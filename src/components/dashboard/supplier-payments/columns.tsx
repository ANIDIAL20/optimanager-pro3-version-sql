"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ExternalLink, X, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SensitiveData } from "@/components/ui/sensitive-data";
import Link from 'next/link';
import { SupplierPayment } from "@/app/actions/supplier-payments-actions";

export const columns: ColumnDef<SupplierPayment>[] = [
    {
        accessorKey: "date",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const date = row.original.date ? new Date(row.original.date) : null;
            return (
                <div className="text-sm font-medium text-slate-900 ml-4">
                    {date && !isNaN(date.getTime())
                        ? format(date, "dd MMM yyyy", { locale: fr })
                        : "-"}
                </div>
            );
        },
    },
    {
        accessorKey: "supplierName",
        header: "Fournisseur",
        cell: ({ row }) => {
            return (
                <div className="font-semibold text-slate-800">
                    {row.original.supplierName}
                </div>
            );
        },
    },
    {
        accessorKey: "amount",
        header: "Montant",
        cell: ({ row }) => {
            return (
                <div className="font-bold text-slate-900">
                    <SensitiveData value={row.original.amount} type="currency" />
                </div>
            );
        },
    },
    {
        accessorKey: "method",
        header: "Mode",
        cell: ({ row }) => {
            return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{row.original.method}</Badge>;
        },
    },
    {
        accessorKey: "reference",
        header: "Réf.",
        cell: ({ row }) => {
            return <div className="text-xs text-slate-500 font-mono">{row.original.reference || '-'}</div>;
        },
    },
    {
        id: "allocations",
        header: "Affectations",
        cell: ({ row }) => {
            const allocations = row.original.allocations || [];
            if (allocations.length === 0) return <span className="text-xs text-slate-400">Non affecté</span>;
            
            return (
                <div className="flex flex-col gap-1">
                    {allocations.map((a: any, i: number) => (
                        <div key={i} className="text-xs flex items-center justify-between gap-2 bg-slate-50 p-1 px-2 rounded border border-slate-100 w-fit">
                            <span>{a.orderRef || `#${a.orderId}`}</span>
                            <span className="font-medium text-slate-600"><SensitiveData value={a.amount} type="currency" /></span>
                        </div>
                    ))}
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <PaymentActions payment={row.original} />
    }
];

import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { deleteSupplierPayment } from "@/app/actions/supplier-payments-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";
import React from "react";

function PaymentActions({ payment }: { payment: SupplierPayment }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();

    const handleDelete = async () => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce paiement ? Les montants des commandes seront ajustés.")) return;
        
        startTransition(async () => {
             const res = await deleteSupplierPayment(payment.id);
             if (res.success) {
                 toast({ title: "Succès", description: res.message, className: "bg-green-600 text-white border-none" });
                 router.refresh();
             } else {
                 toast({ title: "Erreur", description: res.error, variant: "destructive" });
             }
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Menu</span>
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem 
                    onClick={handleDelete} 
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    disabled={isPending}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
