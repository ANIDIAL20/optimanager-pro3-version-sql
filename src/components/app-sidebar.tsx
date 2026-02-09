'use client';

import * as React from "react"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    LayoutDashboard,
    Users,
    Truck,
    Package,
    ShoppingCart,
    ShieldCheck,
    Settings,
    FileText,
    Receipt,
    FileSpreadsheet,
    Warehouse,
    Bell
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from "@/components/ui/sidebar";

import { UserProfile } from "@/components/user-profile";
import { RemindersBadge } from "@/components/reminders/reminders-badge";

import Image from 'next/image';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user;
    // const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL; // Deprecated
    // const isAdmin = user?.email === ADMIN_EMAIL; // Deprecated

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center">
                    {/* Expanded State: Full Logo */}
                    <div className="hidden group-data-[state=expanded]:block">
                        <Image
                            src="/logo-full.png"
                            alt="OptiManager Pro"
                            width={190}
                            height={48}
                            className="object-contain object-left"
                            priority
                        />
                    </div>

                    {/* Collapsed State: Icon Only */}
                    <div className="hidden group-data-[state=collapsed]:block">
                        <Image
                            src="/logo-icon.png"
                            alt="OM"
                            width={42}
                            height={42}
                            className="object-contain"
                        />
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>

                    {/* Dashboard */}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Tableau de bord">
                            <Link href="/dashboard">
                                <LayoutDashboard className="size-5" strokeWidth={1.5} />
                                <span>Tableau de bord</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Contacts */}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/clients'} tooltip="Clients">
                            <Link href="/dashboard/clients">
                                <Users className="size-5" strokeWidth={1.5} />
                                <span>Clients</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/suppliers')} tooltip="Fournisseurs">
                            <Link href="/suppliers">
                                <Truck className="size-5" strokeWidth={1.5} />
                                <span>Fournisseurs</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                </SidebarMenu>

                {/* GESTION STOCK */}
                <SidebarGroup>
                    <SidebarGroupLabel>Gestion Stock</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/produits'} tooltip="Stock & Produits">
                                    <Link href="/produits">
                                        <Package className="size-5" strokeWidth={1.5} />
                                        <span>Stock & Produits</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>


                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* GESTION COMMERCIALE */}
                <SidebarGroup>
                    <SidebarGroupLabel>Gestion Commerciale</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/dashboard/devis'} tooltip="Devis">
                                    <Link href="/dashboard/devis">
                                        <FileText className="size-5" strokeWidth={1.5} />
                                        <span>Devis</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/dashboard/ventes'} tooltip="Ventes">
                                    <Link href="/dashboard/ventes">
                                        <Receipt className="size-5" strokeWidth={1.5} />
                                        <span>Ventes</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* COMPTABILITÉ */}
                <SidebarGroup>
                    <SidebarGroupLabel>Comptabilité</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/dashboard/compta'} tooltip="Exports & Rapports">
                                    <Link href="/dashboard/compta">
                                        <FileSpreadsheet className="size-5" strokeWidth={1.5} />
                                        <span>Exports & Rapports</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* PARAMETRES */}
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/rappels'} tooltip="Rappels">
                            <Link href="/dashboard/rappels">
                                <Bell className="size-5" strokeWidth={1.5} />
                                <span>Rappels</span>
                                <RemindersBadge />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/parametres'} tooltip="Paramètres">
                            <Link href="/dashboard/parametres">
                                <Settings className="size-5" strokeWidth={1.5} />
                                <span>Paramètres</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Admin Link (Role Based) */}
                    {user?.role === 'ADMIN' && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname?.startsWith('/admin')}
                                tooltip="Admin Panel"
                                className="mt-auto"
                            >
                                <Link href="/admin">
                                    <ShieldCheck className="size-5" strokeWidth={1.5} />
                                    <span>Admin Panel</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}

                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <UserProfile />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
