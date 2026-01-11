'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    Eye,
    Package,
    Receipt,
    Settings,
} from 'lucide-react';

const navigationItems = [
    {
        label: 'Tableau de bord',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        label: 'Dossiers Clients',
        href: '/clients',
        icon: Users,
    },
    {
        label: 'Commandes Verres',
        href: '/orders',
        icon: Eye,
    },
    {
        label: 'Stock Montures',
        href: '/inventory',
        icon: Package,
    },
    {
        label: 'Facturation',
        href: '/invoices',
        icon: Receipt,
    },
    {
        label: 'Paramètres',
        href: '/settings',
        icon: Settings,
    },
];

export function DashboardSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col">
            {/* Logo Section */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-slate-900 text-lg">OptiManager</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 overflow-y-auto">
                <ul className="space-y-1">
                    {navigationItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm',
                                        isActive
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900'
                                    )}
                                >
                                    {/* Active Indicator Line */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                                    )}

                                    <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-blue-600' : 'text-slate-500')} />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer Section (Optional) */}
            <div className="p-4 border-t border-slate-200/60">
                <div className="px-3 py-2 rounded-lg bg-slate-100/60">
                    <p className="text-xs text-slate-600 font-medium">OptiManager Pro</p>
                    <p className="text-xs text-slate-500">Version 3.0</p>
                </div>
            </div>
        </aside>
    );
}
