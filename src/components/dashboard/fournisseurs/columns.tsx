"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Phone, Mail, Building2 } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
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
import type { Supplier as SupplierType } from "@/lib/types";

// Extend the Supplier type for table display
export type Supplier = SupplierType;



export const columns: ColumnDef<Supplier>[] = [
    {
        accessorKey: "nomCommercial",
        header: "Entreprise",
        cell: ({ row }) => {
            const supplier = row.original;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                            {supplier.nomCommercial?.charAt(0) || "S"}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-slate-900">{supplier.nomCommercial}</div>
                        {supplier.email && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {supplier.email}
                            </div>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "contactNom",
        header: "Représentant",
        cell: ({ row }) => {
            return (
                <div className="font-medium text-slate-700">
                    {row.getValue("contactNom") || "-"}
                </div>
            );
        },
    },
    {
        accessorKey: "telephone",
        header: "Téléphone",
        cell: ({ row }) => {
            const phone = row.getValue("telephone") as string;
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
        accessorKey: "typeProduits",
        header: "Catégorie",
        cell: ({ row }) => {
            const typeProduits = row.getValue("typeProduits") as string[] | undefined;
            const colorMap: Record<string, string> = {
                "Verres": "bg-blue-100 text-blue-700 border-blue-200",
                "Montures": "bg-purple-100 text-purple-700 border-purple-200",
                "Accessoires": "bg-teal-100 text-teal-700 border-teal-200",
                "Lentilles": "bg-green-100 text-green-700 border-green-200",
                "Divers": "bg-amber-100 text-amber-700 border-amber-200",
            };

            if (!typeProduits || typeProduits.length === 0) {
                return <span className="text-slate-400">-</span>;
            }

            // Show first category as main badge, with count if multiple
            const firstType = typeProduits[0];
            const color = colorMap[firstType] || "bg-slate-100 text-slate-700 border-slate-200";
            const Icon = getCategoryIcon(firstType);

            return (
                <div className="flex items-center gap-1">
                    <Badge variant="outline" className={color}>
                        <div className="flex items-center">
                            <Icon className="mr-1 h-3 w-3" />
                            {firstType}
                        </div>
                    </Badge>
                    {typeProduits.length > 1 && (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                            +{typeProduits.length - 1}
                        </Badge>
                    )}
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const supplier = row.original;

            return (
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
                        <DropdownMenuItem asChild>
                            <Link href={`/suppliers/${supplier.id}`}>
                                Voir détails
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/suppliers/${supplier.id}/edit`}>
                                Modifier
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
