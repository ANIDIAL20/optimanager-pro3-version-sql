'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { BrandLoader } from '@/components/ui/loader-brand';

export default function AppShell({ children, banner }: { children: React.ReactNode, banner?: any }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isBannerVisible, setIsBannerVisible] = useState(true);

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
                    <AppSidebar />
                    <SidebarInset>
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

                        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/60 px-4 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                            <SidebarTrigger className="-ml-1" />
                            <div className="h-4 w-px bg-slate-200 mx-2" />
                            <span className="text-sm font-medium text-slate-700 capitalize">
                                {(() => {
                                    // Generate breadcrumb from pathname
                                    const pathSegments = pathname?.split('/').filter(Boolean) || [];

                                    // Sanitize segments - replace Firebase IDs with friendly names
                                    const sanitizedSegments = pathSegments.map((segment, index) => {
                                        // If segment looks like a Firebase ID (long alphanumeric string > 15 chars)
                                        if (segment.length > 15 && /^[a-zA-Z0-9]{15,}$/.test(segment)) {
                                            // Replace with context-specific label
                                            if (pathSegments[index - 1] === 'clients') {
                                                return 'Dossier Client';
                                            }
                                            if (pathSegments[index - 1] === 'products') {
                                                return 'Fiche Produit';
                                            }
                                            if (pathSegments[index - 1] === 'commandes') {
                                                return 'Détails Commande';
                                            }
                                            return 'Détails';
                                        }
                                        // Normal segments - capitalize and replace hyphens
                                        return segment.replace(/-/g, ' ');
                                    });

                                    return sanitizedSegments.join(' / ') || 'Tableau de bord';
                                })()}
                            </span>
                        </header>

                        <main className="flex-1 overflow-auto p-6">
                            {children}
                        </main>
                    </SidebarInset>
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
