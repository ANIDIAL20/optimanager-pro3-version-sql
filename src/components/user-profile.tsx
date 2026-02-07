'use client';

import * as React from 'react';
import {
    ChevronsUpDown,
    LogOut,
    Settings,
    EyeOff,
    MessageCircle,
    TrendingUp,
} from "lucide-react";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from '@/lib/utils';
import { usePrivacy } from "@/context/privacy-context";

export function UserProfile() {
    const { isMobile } = useSidebar();
    const { data: session } = useSession();
    const user = session?.user;
    const router = useRouter();
    const { isPatientMode, togglePatientMode } = usePrivacy();

    // Mock plan usage data - replace with actual data from your subscription system
    const planUsage = {
        clients: 850,
        maxClients: 1000,
        percentage: 85, // (850/1000) * 100
    };

    const isNearLimit = planUsage.percentage > 80;

    if (!user) return null;

    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const isAdmin = user.email === ADMIN_EMAIL;

    const displayName = user.name || "Utilisateur";
    const initials = (user.name || user.email || "U")
        .substring(0, 2)
        .toUpperCase();

    const handleLogout = async () => {
        try {
            await signOut({ callbackUrl: '/login' });
        } catch (error) {
            console.error("Erreur logout:", error);
        }
    };

    const handleWhatsAppSupport = () => {
        // Support WhatsApp number for OptiManager Pro
        const supportNumber = "212608635578"; // Moroccan format: 212 + number without leading 0
        window.open(`https://wa.me/${supportNumber}`, '_blank');
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user.image || ''} alt={displayName} />
                                <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold text-slate-900">
                                    {displayName}
                                </span>
                                <span className="truncate text-xs text-slate-500">
                                    {user.email}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-slate-400" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-xl shadow-xl border border-slate-200/60 bg-white/90 backdrop-blur-xl"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        {/* User Info Header */}
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-2 py-2">
                                <Avatar className="h-10 w-10 rounded-lg border-2 border-white shadow-md">
                                    <AvatarImage src={user.image || ''} alt={displayName} />
                                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left leading-tight">
                                    <span className="truncate font-semibold text-slate-900">{displayName}</span>
                                    <span className="truncate text-xs text-slate-500">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator className="bg-slate-200/60" />

                        {/* Plan Usage Widget */}
                        <div className="px-3 py-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 font-medium">Utilisation du Plan</span>
                                <span className={cn(
                                    "font-bold",
                                    isNearLimit ? "text-orange-600" : "text-slate-900"
                                )}>
                                    {planUsage.clients} / {planUsage.maxClients}
                                </span>
                            </div>
                            <Progress
                                value={planUsage.percentage}
                                className={cn(
                                    "h-2",
                                    isNearLimit && "[&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-amber-500"
                                )}
                            />
                            <p className="text-xs text-slate-500">
                                {isNearLimit ? (
                                    <span className="text-orange-600 font-medium">
                                        ⚠️ Proche de la limite - Envisagez de migrer
                                    </span>
                                ) : (
                                    `${100 - planUsage.percentage}% de capacité restante`
                                )}
                            </p>
                        </div>

                        <DropdownMenuSeparator className="bg-slate-200/60" />

                        {/* Privacy Mode Toggle */}
                        <div className="px-3 py-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <EyeOff className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm font-medium text-slate-700">Mode Patient</span>
                                </div>
                                <Switch
                                    checked={isPatientMode}
                                    onCheckedChange={togglePatientMode}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1 ml-6">
                                Masquer les montants financiers
                            </p>
                        </div>

                        <DropdownMenuSeparator className="bg-slate-200/60" />

                        {/* Actions Group */}
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer hover:bg-slate-100 rounded-md mx-1"
                                onClick={() => router.push('/dashboard/parametres')}
                            >
                                <Settings className="h-4 w-4 text-slate-500" />
                                <span className="text-slate-700">Paramètres</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                className="gap-2 cursor-pointer hover:bg-green-50 rounded-md mx-1"
                                onClick={handleWhatsAppSupport}
                            >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                                <span className="text-slate-700">Support WhatsApp</span>
                            </DropdownMenuItem>

                            {isNearLimit && (
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer hover:bg-orange-50 rounded-md mx-1"
                                >
                                    <TrendingUp className="h-4 w-4 text-orange-600" />
                                    <span className="text-orange-700 font-medium">Migrer le Plan</span>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator className="bg-slate-200/60" />

                        {/* Logout */}
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer rounded-md mx-1 my-1"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="font-medium">Se déconnecter</span>
                        </DropdownMenuItem>

                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
