'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from 'next/link';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { BrandLoader } from '@/components/ui/loader-brand';
import { BreadcrumbCustom } from "@/components/ui/breadcrumb-custom";
import { useBreadcrumbStore } from "@/hooks/use-breadcrumb-store";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { getNotificationsCount } from "@/app/actions/notifications-actions";
import { Bell } from 'lucide-react';

export default function AppShell({ children, banner }: { children: React.ReactNode, banner?: any }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isBannerVisible, setIsBannerVisible] = useState(true);
    const [notificationsCount, setNotificationsCount] = useState(0);
    
    // Breadcrumb store - must be called before any early returns
    const { labels } = useBreadcrumbStore();

    // Initialize global keyboard shortcuts (Power Users)
    useKeyboardShortcuts();

    useEffect(() => {
        let cancelled = false;

        async function loadCount() {
            try {
                const res = await getNotificationsCount();
                if (cancelled) return;
                if (res.success && res.data) setNotificationsCount(res.data.total || 0);
            } catch {
                // ignore
            }
        }

        loadCount();
        const interval = setInterval(loadCount, 2 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    // 1. Define Public and Print Routes
    // Using explicit check to prevent any undefined errors
    const isPublicPage = pathname === '/login';
    const isPrintPage = pathname?.startsWith('/print');
    
    // 2. Auth Guard Effect
    useEffect(() => {
        // Skip check for public or print pages
        if (isPublicPage || isPrintPage) return;

        // Only redirect if explicitly unauthenticated
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, isPublicPage, isPrintPage, router]);

    // 3. Early Returns for Public/Print
    // Always render content immediately for these routes, traversing authentication checks
    if (isPublicPage || isPrintPage) {
        return <>{children}</>;
    }

    // 4. Authenticated State: Render Dashboard
    if (status === 'authenticated') {
        return (
            <div className="relative min-h-screen w-full bg-slate-50">
                {/* Subtle Dot Pattern Background */}
                <div
                    className="fixed inset-0 opacity-30 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle, #e2e8f0 1px, transparent 1px)`,
                        backgroundSize: '16px 16px',
                        maskImage: 'radial-gradient(800px circle at center, white, transparent)',
                        WebkitMaskImage: 'radial-gradient(800px circle at center, white, transparent)',
                    }}
                />

                <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                        <AppSidebar />
                        <SidebarInset className="flex-1 overflow-hidden">
                            {/* Global Banner */}
                            {banner?.active && isBannerVisible && (
                                <div className={`w-full px-4 py-2 flex items-center justify-between text-sm font-medium ${banner.type === 'critical' ? 'bg-red-600 text-white' :
                                    banner.type === 'warning' ? 'bg-orange-500 text-white' :
                                        'bg-blue-600 text-white'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <span>📢</span>
                                        <p>{banner.message}</p>
                                    </div>
                                    <button onClick={() => setIsBannerVisible(false)} className="opacity-80 hover:opacity-100">
                                        ✕
                                    </button>
                                </div>
                            )}

                            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/60 px-6 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
                                <SidebarTrigger className="-ml-1" />
                                <div className="h-4 w-px bg-slate-200 mx-2" />
                                <BreadcrumbCustom 
                                    items={(() => {
                                        const pathSegments = pathname?.split('/').filter(Boolean) || [];
                                        const BREADCRUMB_LABELS: Record<string, string> = {
                                            'dashboard': 'Tableau de bord',
                                            'produits': 'Produits',
                                            'products': 'Produits',
                                            'clients': 'Clients',
                                            'suppliers': 'Fournisseurs',
                                            'devis': 'Devis',
                                            'ventes': 'Ventes',
                                            'sales': 'Ventes',
                                            'compta': 'Comptabilité',
                                            'rappels': 'Rappels',
                                            'parametres': 'Paramètres',
                                            'admin': 'Administration',
                                            'new': 'Nouveau',
                                            'edit': 'Modification',
                                            'stock': 'Stock',
                                            'inventory': 'Stock',
                                        };

                                        // Start with Tableau de bord
                                        const items = [{ 
                                            label: 'Tableau de bord', 
                                            href: '/dashboard',
                                            active: pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')
                                        }];

                                        // Add subsequent segments
                                        pathSegments.forEach((segment, index) => {
                                            // Skip 'dashboard' as it's already added or redundant
                                            if (segment === 'dashboard' && index === 0) return;

                                            let label = segment;
                                            const lowerSegment = segment.toLowerCase();
                                            
                                            // 1. Check Custom Store Labels (Highest Priority)
                                            if (labels[segment]) {
                                                label = labels[segment];
                                            } 
                                            // 2. Check Static Map
                                            else if (BREADCRUMB_LABELS[lowerSegment]) {
                                                label = BREADCRUMB_LABELS[lowerSegment];
                                                
                                                // Specific case: '/produits/new' -> 'Nouveau produit'
                                                if (segment === 'new' && pathSegments[index - 1] === 'produits') {
                                                    label = 'Nouveau produit';
                                                }
                                            } 
                                            // 3. Check for ID patterns
                                            else if (segment.length > 15 && /^[a-zA-Z0-9-]{15,}$/.test(segment)) {
                                                const prevSegment = pathSegments[index - 1];
                                                if (prevSegment === 'clients') label = 'Dossier Client';
                                                else if (prevSegment === 'products' || prevSegment === 'produits') label = 'Fiche Produit';
                                                else if (prevSegment === 'commandes' || prevSegment === 'ventes') label = 'Détails Commande';
                                                else if (prevSegment === 'suppliers') label = 'Fiche Fournisseur';
                                                else label = 'Détails';
                                            } 
                                            // 4. Fallback: Capitalize
                                            else {
                                                label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
                                            }

                                            const href = '/' + pathSegments.slice(0, index + 1).join('/');
                                            items.push({
                                                label,
                                                href,
                                                active: index === pathSegments.length - 1
                                            });
                                        });

                                        // Deduplicate: if we have two "Tableau de bord" at start, remove the second one
                                        if (items.length > 1 && items[0].label === items[1].label) {
                                            items.splice(1, 1);
                                        }

                                        return items;
                                    })()}
                                />
                                <div className="ml-auto flex items-center gap-2">
                                    <Link href="/dashboard/notifications" className="relative p-2">
                                        <Bell size={20} />
                                        {notificationsCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                                {notificationsCount > 99 ? '99+' : notificationsCount}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            </header>

                            <main className="flex-1 overflow-y-auto bg-slate-50/50">
                                <div className="p-4 md:p-8">
                                    {children}
                                </div>
                            </main>
                        </SidebarInset>
                    </div>
                </SidebarProvider>
            </div>
        );
    }

    // 5. Loading State (Fallback)
    // Show loading while fetching session or if unauthenticated (while waiting for redirect)
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <BrandLoader size="lg" className="mx-auto" />
            </div>
            <p className="text-sm text-gray-400 font-medium animate-pulse">
                {status === 'loading' ? "Vérification de l'accès..." : "Redirection..."}
            </p>
        </div>
    );

}
