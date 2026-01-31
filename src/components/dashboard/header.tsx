'use client';

import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface DashboardHeaderProps {
    onMenuClick?: () => void;
    breadcrumb?: string;
}

export function DashboardHeader({ onMenuClick, breadcrumb = 'Tableau de bord' }: DashboardHeaderProps) {
    const { data: session } = useSession();
    const user = session?.user;
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut({ callbackUrl: '/login' });
            toast.success('Déconnexion réussie');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Erreur lors de la déconnexion');
        }
    };

    return (
        <header className="h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
            {/* Left Section: Menu Button (Mobile) + Breadcrumb */}
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onMenuClick}
                >
                    <Menu className="w-5 h-5" />
                </Button>

                {/* Breadcrumb */}
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-slate-900">{breadcrumb}</h1>
                </div>
            </div>

            {/* Right Section: Notifications + User Profile */}
            <div className="flex items-center gap-3">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-slate-600" />
                    {/* Notification Badge */}
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </Button>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-slate-100/60">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-teal-500 text-white text-sm">
                                    {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-slate-900">
                                    {user?.name || 'Utilisateur'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {user?.email}
                                </p>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-xl">
                        <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/profile')}>
                            Profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/settings')}>
                            Paramètres
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                            Déconnexion
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
