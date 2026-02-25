"use client";

import * as React from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, Eye, CreditCard, Trash2, Glasses, Sun, Wrench, Disc, SprayCan, Link as LinkIcon, Briefcase, Puzzle, ShoppingBag, ShoppingCart, CheckCircle2, AlertTriangle } from "lucide-react";
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
// TODO: Migrate to SQL actions for invoice generation and delete
// import { doc, getDoc, deleteDoc } from 'firebase/firestore';
// import { useFirestore, useFirebase } from '@/firebase';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Sale } from "@/lib/types";
import { SensitiveData } from "@/components/ui/sensitive-data";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { PaymentDialog } from "./payment-dialog";
import { deleteSale, updateDeliveryStatus } from "@/app/actions/sales-actions";
import { useToast } from "@/hooks/use-toast";

// Extended Sale type with client info for display
export type Order = Sale & {
    clientNom?: string;
    clientPrenom?: string;
};

// Utility function
const safeNum = (num: number | undefined) => num || 0;

export const columns: ColumnDef<Order>[] = [
    {
        accessorKey: "type",
        header: "",
        cell: ({ row }) => {
            const type = (row.original.type || '').toLowerCase();

            if (type.includes('monture') || type.includes('lunettes')) {
                return <Glasses className="h-4 w-4 text-blue-600" />;
            } else if (type.includes('verres')) {
                return <Disc className="h-4 w-4 text-purple-600" />;
            } else if (type.includes('lentille')) {
                return <Eye className="h-4 w-4 text-teal-600" />;
            } else if (type.includes('entretien')) {
                return <SprayCan className="h-4 w-4 text-cyan-600" />;
            } else if (type.includes('cordon')) {
                return <LinkIcon className="h-4 w-4 text-orange-600" />;
            } else if (type.includes('etui') || type.includes('étui')) {
                return <Briefcase className="h-4 w-4 text-amber-700" />;
            } else if (type.includes('accessoire')) {
                return <Puzzle className="h-4 w-4 text-indigo-600" />;
            } else if (type.includes('reparation') || type.includes('materiel')) {
                return <Wrench className="h-4 w-4 text-slate-600" />;
            }

            return <ShoppingBag className="h-4 w-4 text-gray-500" />;
        },
    },
    {
        accessorKey: "id",
        header: "Commande",
        cell: ({ row }) => {
            const date = row.original.date ? new Date(row.original.date) : null;
            return (
                <div className="space-y-1">
                    <div className="font-mono font-bold text-slate-900">
                        #{row.original.id.slice(0, 8)}
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
        accessorKey: "clientNom",
        header: "Client",
        cell: ({ row }) => {
            const order = row.original;
            const fullName = order.clientPrenom && order.clientNom
                ? `${order.clientPrenom} ${order.clientNom}`
                : "Client Inconnu";

            return (
                <div className="font-medium text-slate-700">
                    {fullName}
                </div>
            );
        },
    },
    {
        accessorKey: "deliveryStatus", // Delivery Status
        header: "État (Livraison)",
        cell: ({ row }) => {
            // Normalize status
            const status = (row.original.deliveryStatus || 'en_attente').toLowerCase();

            let badgeText = "En attente";
            let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";

            if (status.includes('cours')) {
                badgeText = "En cours";
                badgeClass = "bg-orange-100 text-orange-700 border-orange-200";
            } else if (status.includes('prêt') || status.includes('pret')) {
                badgeText = "Prêt";
                badgeClass = "bg-blue-100 text-blue-700 border-blue-200";
            } else if (status.includes('livré') || status.includes('livre')) {
                badgeText = "Livré";
                badgeClass = "bg-green-100 text-green-700 border-green-200";
            }

            return (
                <Badge variant="outline" className={cn("rounded-full font-normal", badgeClass)}>
                    {badgeText}
                </Badge>
            );
        },
    },
    {
        accessorKey: "totalNet",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Montant
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const totalNet = safeNum(row.original.totalNet);
            return (
                <div className="font-bold text-slate-900">
                    <SensitiveData value={totalNet} type="currency" />
                </div>
            );
        },
    },
    {
        accessorKey: "totalPaye",
        header: "Payé",
        cell: ({ row }) => {
            const totalPaye = safeNum(row.original.totalPaye);
            return (
                <div className="font-semibold text-green-700">
                    <SensitiveData value={totalPaye} type="currency" />
                </div>
            );
        },
    },
    {
        accessorKey: "resteAPayer",
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
        header: "Statut (Paiement)",
        cell: ({ row }) => {
            const reste = safeNum(row.original.resteAPayer);
            const paye = safeNum(row.original.totalPaye);
            const isPaid = reste <= 0.01;
            const isPartial = paye > 0 && reste > 0.01;

            let badgeText = "Impayé";
            let badgeClass = "bg-red-100 text-red-700 border-red-200";

            if (isPaid) {
                badgeText = "Payé";
                badgeClass = "bg-green-100 text-green-700 border-green-200";
            } else if (isPartial) {
                badgeText = "Partiel";
                badgeClass = "bg-orange-100 text-orange-700 border-orange-200";
            }

            return (
                <Badge
                    variant="outline"
                    className={cn("rounded-full", badgeClass)}
                >
                    {badgeText}
                </Badge>
            );
        },
    },
    {
        accessorKey: "isOfficialInvoice",
        header: "Facture",
        cell: ({ row }) => {
            const isOfficial = row.original.isOfficialInvoice;

            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "rounded-full text-[10px] font-bold uppercase flex w-fit items-center gap-1",
                        isOfficial ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-orange-100 text-orange-700 border-orange-200"
                    )}
                >
                    {isOfficial ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {isOfficial ? "Officielle" : "Hors-Bilan"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const order = row.original;

            return <OrderActions order={order} />;
        },
    },
];

function OrderActions({ order }: { order: Order }) {
    const router = useRouter();
    const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
    
    // TODO: Replace with SQL queries
    // const firestore = useFirestore();
    // const { user } = useFirebase();
    const { toast } = useToast();
    const client = null;
    const shopSettings = null;
    const isLoading = false;

    // ... (keep commented out Firebase stuff if you want, or remove it. I'll just remove implicit logic to keep it clean)

    const handleDelete = async () => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande #${order.id.substring(0, 8)} ? Cette action est irréversible.`)) {
            return;
        }
        
        try {
            const result = await deleteSale(order.id);
            if (result.success) {
                toast({
                     title: "✅ Vente supprimée",
                     description: "La commande a été supprimée avec succès.",
                });
                router.refresh();
            } else {
                 toast({
                     variant: "destructive",
                     title: "Erreur",
                     description: result.error || "Impossible de supprimer la vente.",
                });
            }
        } catch (error) {
            console.error('Error deleting order:', error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur inattendue est survenue.",
           });
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                {/* Invoice Actions Button */}
                {!isLoading && client && shopSettings && (
                    <InvoiceActions
                        sale={order}
                        client={client}
                        shopSettings={shopSettings}
                    />
                )}

                {/* Other Actions Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => router.push(`/dashboard/ventes/${order.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir les détails
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => setShowPaymentDialog(true)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Enregistrer un Paiement
                        </DropdownMenuItem>

                        {order.deliveryStatus !== 'livre' && order.deliveryStatus !== 'pret' && (
                            <DropdownMenuItem onClick={async () => {
                                try {
                                    const res = await updateDeliveryStatus(order.id, 'pret');
                                    if (res.success) {
                                        toast({ title: "✅ Commande prête", description: "La commande est marquée comme prête pour livraison." });
                                        router.refresh();
                                    } else {
                                        toast({ variant: "destructive", title: "Erreur", description: res.error });
                                    }
                                } catch (e) {
                                     toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
                                }
                            }}>
                                <ShoppingBag className="mr-2 h-4 w-4" />
                                Marquer comme Prêt
                            </DropdownMenuItem>
                        )}

                        {order.deliveryStatus !== 'livre' && (
                            <DropdownMenuItem onClick={async () => {
                                try {
                                    const res = await updateDeliveryStatus(order.id, 'livre');
                                    if (res.success) {
                                        toast({ title: "✅ Livraison mise à jour", description: "La commande est marquée comme livrée." });
                                        router.refresh();
                                    } else {
                                        toast({ variant: "destructive", title: "Erreur", description: res.error });
                                    }
                                } catch (e) {
                                     toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
                                }
                            }}>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Marquer comme Livré
                            </DropdownMenuItem>
                        )}



                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={handleDelete}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Payment Dialog */}
            <PaymentDialog
                order={order}
                open={showPaymentDialog}
                onOpenChange={setShowPaymentDialog}
            />
        </>
    );
}
