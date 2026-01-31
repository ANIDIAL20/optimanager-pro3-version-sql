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

import Image from 'next/image';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user;
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const isAdmin = user?.email === ADMIN_EMAIL;
    const [reminderCount, setReminderCount] = React.useState(0);

    React.useEffect(() => {
        if (!user) return;
        
        // Fetch count on load
        const fetchCount = async () => {
            try {
                // Dynamically import to avoid server-action issues in client component if strict
                const { getUnreadReminderCount } = await import('@/app/actions/reminder-actions');
                const count = await getUnreadReminderCount();
                setReminderCount(count);
            } catch (error) {
                console.error("Failed to fetch reminders count", error);
            }
        };

        fetchCount();

        // Optional: Poll every minute
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, [user, pathname]); // Re-fetch on navigation too

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
                                <LayoutDashboard />
                                <span>Tableau de bord</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Contacts */}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/clients'} tooltip="Clients">
                            <Link href="/dashboard/clients">
                                <Users />
                                <span>Clients</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/suppliers')} tooltip="Fournisseurs">
                            <Link href="/suppliers">
                                <Truck />
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
                                        <Package />
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
                                        <FileText />
                                        <span>Devis</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/dashboard/ventes'} tooltip="Ventes">
                                    <Link href="/dashboard/ventes">
                                        <Receipt />
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
                                        <FileSpreadsheet />
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
                            <Link href="/dashboard/rappels" className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Bell />
                                    <span>Rappels</span>
                                </div>
                                {reminderCount > 0 && (
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                                        {reminderCount > 99 ? '99+' : reminderCount}
                                    </span>
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/parametres'} tooltip="Paramètres">
                            <Link href="/dashboard/parametres">
                                <Settings />
                                <span>Paramètres</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Admin Link (Hidden for clients) */}
                    {isAdmin && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/admin'}
                                tooltip="Super Admin"
                                className="mt-auto"
                            >
                                <Link href="/admin">
                                    <ShieldCheck />
                                    <span>Super Admin</span>
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
