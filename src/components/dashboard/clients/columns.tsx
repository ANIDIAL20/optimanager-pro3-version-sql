"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientActions } from "./client-actions";
import { MoreHorizontal, Phone, Mail, MapPin, Eye, ShoppingBag, Calendar } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SensitiveData } from "@/components/ui/sensitive-data";

export type Client = {
    id: string;
    nom: string;
    prenom: string;
    sexe?: string;
    telephone1?: string;
    email?: string;
    ville?: string;
    solde?: number;
    derniereVisite?: string | Date;
};

export const columns: ColumnDef<Client>[] = [
    {
        accessorKey: "nom",
        header: "Client",
        cell: ({ row }) => {
            const client = row.original;
            const initials = `${client.prenom?.charAt(0) || ''}${client.nom?.charAt(0) || ''}`.toUpperCase();

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <Link href={`/clients/${client.id}?tab=overview`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                            {client.prenom} {client.nom}
                        </Link>
                        {client.email && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {client.email}
                            </div>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "telephone1",
        header: "Téléphone",
        cell: ({ row }) => {
            const phone = row.getValue("telephone1") as string;
            return phone ? (
                <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="font-mono text-sm">{phone}</span>
                </div>
            ) : (
                <span className="text-slate-400">-</span>
            );
        },
    },
    {
        accessorKey: "derniereVisite",
        header: "Dernière Visite",
        cell: ({ row }) => {
            const date = row.getValue("derniereVisite") as string | Date;
            if (!date) return <span className="text-slate-400">Nouveau</span>;

            try {
                const d = typeof date === 'string' ? new Date(date) : date;
                return (
                    <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">{format(d, 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                );
            } catch {
                return <span className="text-slate-400">-</span>;
            }
        },
    },
    {
        accessorKey: "solde",
        header: "Solde",
        cell: ({ row }) => {
            const solde = row.getValue("solde") as number;
            const amount = solde || 0;

            return (
                <div className="font-semibold">
                    {amount > 0 ? (
                        <span className="text-green-600">
                            +<SensitiveData value={amount} type="currency" className="text-green-600" />
                        </span>
                    ) : amount < 0 ? (
                        <span className="text-red-600">
                            <SensitiveData value={amount} type="currency" className="text-red-600" />
                        </span>
                    ) : (
                        <span className="text-slate-500">
                            <SensitiveData value={0} type="currency" className="text-slate-500" />
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const client = row.original;
            return <ClientActions client={client} />;
        },
    },
];
