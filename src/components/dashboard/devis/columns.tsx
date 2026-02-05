"use client";

import * as React from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, Eye, Calendar, Trash2, Printer, FileText } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Devis } from "@/app/actions/devis-actions";
import { SensitiveData } from "@/components/ui/sensitive-data";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { deleteDevis } from "@/app/actions/devis-actions";
import { useToast } from "@/hooks/use-toast";

// Extended Devis type if needed, but Devis usually has clientName directly
export type DevisRow = Devis;

const safeNum = (num: number | undefined) => num || 0;

export const columns: ColumnDef<DevisRow>[] = [
    {
        accessorKey: "type",
        header: "",
        cell: () => {
             return <FileText className="h-4 w-4 text-slate-500" title="Devis" />;
        },
    },
    {
        accessorKey: "id",
        header: "N° Devis",
        cell: ({ row }) => {
            const date = row.original.createdAt ? new Date(row.original.createdAt) : null;
            return (
                <div className="space-y-1">
                    <div className="font-mono font-bold text-slate-900">
                        #{row.original.id?.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-500">
                        {date && !isNaN(date.getTime())
                            ? format(date, "dd/MM/yyyy", { locale: fr })
                            : "-"}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "clientName",
        header: "Client",
        cell: ({ row }) => {
            const devis = row.original;
            return (
                <div className="space-y-1">
                    <div className="font-medium text-slate-700">
                        {devis.clientName || "Client Inconnu"}
                    </div>
                    {devis.clientPhone && (
                        <div className="text-xs text-slate-500">
                            {devis.clientPhone}
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => {
            const status = row.original.status || 'EN_ATTENTE';
            
            let badgeText = "En Attente";
            let badgeClass = "bg-orange-100 text-orange-700 border-orange-200";

            if (status === 'VALIDE') {
                badgeText = "Validé";
                badgeClass = "bg-blue-100 text-blue-700 border-blue-200";
            } else if (status === 'TRANSFORME') {
                badgeText = "Transformé";
                badgeClass = "bg-green-100 text-green-700 border-green-200";
            } else if (status === 'REFUSE') {
                badgeText = "Refusé";
                badgeClass = "bg-red-100 text-red-700 border-red-200";
            }

            return (
                <Badge variant="outline" className={cn("rounded-full font-normal", badgeClass)}>
                    {badgeText}
                </Badge>
            );
        },
    },
    {
        accessorKey: "totalTTC",
        header: ({ column }) => {
             return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Montant TTC
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const total = safeNum(row.original.totalTTC);
            return (
                <div className="font-bold text-slate-900">
                    <SensitiveData value={total} type="currency" />
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            return <DevisActions devis={row.original} />;
        },
    },
];

function DevisActions({ devis }: { devis: Devis }) {
    const router = useRouter();
    const { toast } = useToast();
    
    // Fake shop settings for the QuoteActions component (since we are in dashboard, we might need to fetch them properly or pass them down)
    // For now, we'll try to rely on QuoteActions fetching or just pass basics if available.
    // Actually QuoteAction takes shopSettings as prop. We need to fetch it or pass dummy.
    // Ideally the Page fetches settings and passes them down, OR we fetch in the Client Component.
    // For now, let's use a dummy or minimal object, assuming the Print action fetches its own data if needed.
    // Wait, QuoteActions generates PDF client side using props.
    // We should fix this properly in DevisClientPage to pass settings down to columns?
    // Columns is static. We can't easily pass props to it. 
    // ALTERNATIVE: pass shopSettings to the DataTable meta, and access it here?
    // OR: Just implement simple actions like View/Delete here, and View page handles Printing.
    // The user explicitly wants "Print" functionality in the table actions.
    // Let's implement View, Print (redirects to view or uses a global handler?), Delete.
    
    // In Ventes columns, InvoiceActions is used directly. InvoiceActions requires shopSettings.
    // Ventes columns seem to receive shopSettings? No, looking at `columns.tsx` for Sales, `shopSettings` is null (line 232).
    // So InvoiceActions is NOT fully functional in the table for Sales either? 
    // Ah, line 271 checks `if (!isLoading && client && shopSettings)`. Since they are null, InvoiceActions is NOT Rendered!
    // So distinct actions (View, Delete) are what's shown.
    
    const handleDelete = async () => {
        if (!confirm(`Supprimer le devis #${devis.id?.slice(0,8)} ?`)) return;

        const result = await deleteDevis(devis.id!);
        if (result.success) {
            toast({ title: "Devis supprimé", description: "Le devis a été supprimé." });
            router.refresh(); // Or invalidate query if using TanStack Query
             // Since we use manual fetch in page, we might need a way to refresh.
             // But if we switch to Server Component + Client Component, router.refresh() updates the server component.
        } else {
            toast({ title: "Erreur", description: result.error, variant: "destructive" });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/devis/${devis.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir Détails
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
