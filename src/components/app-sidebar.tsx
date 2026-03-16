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
    Bell,
    Banknote,
    BarChart3,
    Zap,
    Leaf,
    RefreshCw
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
import { useMode } from "@/contexts/mode-context";
import { cn } from "@/lib/utils";
import { BulkReceiveModal } from "@/components/suppliers/BulkReceiveModal";

import Image from 'next/image';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { isBasicMode, isExpertMode, toggleMode } = useMode();
    const user = session?.user;

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center">
                    {/* Expanded State: Full Logo */}
                    <div className="hidden group-data-[state=expanded]:block">
                        <Image
                            src="/logo-full.png"
                            alt="OptiManager Pro"
                            width={160}
                            height={40}
                            className="w-32 h-auto object-contain object-left"
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
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/ventes'} tooltip="Ventes">
                            <Link href="/dashboard/ventes">
                                <Receipt className="size-5" strokeWidth={1.5} />
                                <span>Ventes</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/produits'} tooltip="Stock & Produits">
                            <Link href="/produits">
                                <Package className="size-5" strokeWidth={1.5} />
                                <span>Stock & Produits</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/rappels'} tooltip="Rappels">
                            <Link href="/dashboard/rappels">
                                <Bell className="size-5" strokeWidth={1.5} />
                                <span>Rappels</span>
                                <RemindersBadge />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                </SidebarMenu>

                {/* Expert Section */}
                {isExpertMode && (
                    <>
                        <div className="sidebar-divider" />
                        <div className="sidebar-section-title group-data-[collapsible=icon]:hidden">
                            Mode Expert
                        </div>

                        <SidebarGroup className="p-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname.startsWith('/suppliers')} tooltip="Fournisseurs">
                                        <Link href="/suppliers">
                                            <Truck className="size-5" strokeWidth={1.5} />
                                            <span>Fournisseurs</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>


                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/devis'} tooltip="Devis">
                                        <Link href="/dashboard/devis">
                                            <FileText className="size-5" strokeWidth={1.5} />
                                            <span>Devis</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname.startsWith('/expenses')} tooltip="Les Charges">
                                        <Link href="/expenses">
                                            <Banknote className="size-5" strokeWidth={1.5} />
                                            <span>Les Charges</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/compta'} tooltip="Exports & Rapports">
                                        <Link href="/dashboard/compta">
                                            <FileSpreadsheet className="size-5" strokeWidth={1.5} />
                                            <span>Exports & Rapports</span>
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
                            </SidebarMenu>
                        </SidebarGroup>
                    </>
                )}

                {/* Comptabilité (Role Based) */}
                {(user?.role === 'ADMIN' || (user as any)?.role === 'COMPTABLE') && (
                    <SidebarMenu className="mt-auto pb-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname?.startsWith('/dashboard/comptabilite')}
                                tooltip="Comptabilité"
                            >
                                <Link href="/dashboard/comptabilite">
                                    <BarChart3 className="size-5 text-emerald-600" strokeWidth={1.5} />
                                    <span className="font-semibold text-emerald-800">Comptabilité</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}

                {/* Admin Link (Role Based) */}
                {user?.role === 'ADMIN' && (
                    <SidebarMenu className={user?.role === 'ADMIN' ? "" : "mt-auto"}>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname?.startsWith('/admin')}
                                tooltip="Admin Panel"
                            >
                                <Link href="/admin">
                                    <ShieldCheck className="size-5" strokeWidth={1.5} />
                                    <span>Admin Panel</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarContent>

            <SidebarFooter>
                <div className="group-data-[collapsible=icon]:hidden px-3 pb-3">
                    <div className={cn(
                        "relative flex flex-col gap-2 p-3 rounded-2xl transition-all duration-500 overflow-hidden",
                        isExpertMode 
                            ? "bg-gradient-to-br from-[#1e1b4b] to-[#1a1730] shadow-[0_4px_20px_-4px_rgba(99,102,241,0.4)] ring-1 ring-white/10"
                            : "bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 shadow-sm ring-1 ring-indigo-200/50"
                    )}>
                        {/* Decorative background effects for expert mode */}
                        {isExpertMode && (
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-violet-500/20 blur-xl rounded-full pointer-events-none" />
                        )}
                        
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-xl shadow-sm transition-all duration-300",
                                    isExpertMode 
                                        ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/40"
                                        : "bg-gradient-to-br from-indigo-400 to-blue-500 text-white shadow-indigo-500/20"
                                )}>
                                    {isExpertMode ? (
                                        <Zap className="w-4 h-4 text-white fill-current opacity-90" />
                                    ) : (
                                        <Leaf className="w-4 h-4 text-white fill-current opacity-90" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-xs font-bold transition-colors duration-300",
                                        isExpertMode ? "text-white" : "text-indigo-950"
                                    )}>
                                        {isExpertMode ? "Mode Expert" : "Mode Basique"}
                                    </span>
                                    <span className={cn(
                                        "text-[9px] font-medium transition-colors duration-300",
                                        isExpertMode ? "text-violet-300/70" : "text-indigo-700/70"
                                    )}>
                                        {isExpertMode ? "Toutes fonctionnalités" : "Essentiel & Rapide"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Switch Button */}
                        <button 
                            onClick={toggleMode}
                            className={cn(
                                "relative z-10 w-full mt-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300",
                                isExpertMode 
                                    ? "bg-white/5 text-violet-200 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                                    : "bg-white/60 text-indigo-800 ring-1 ring-indigo-200/50 hover:bg-white hover:text-indigo-900 shadow-sm"
                            )}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isExpertMode ? "" : "text-indigo-600")} />
                            Basculer vers {isExpertMode ? "Basique" : "Expert"}
                        </button>
                    </div>
                </div>
                <UserProfile />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
