import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { auth } from '@/auth';
import { getClientUsageStats } from '@/app/actions/adminActions';
import { getProducts, getCategories } from '@/app/actions/products-actions';
import { type ProductWithRelations } from '@/components/dashboard/produits/columns';
import { redirect } from 'next/navigation';
import { ErrorBoundary } from '@/components/error-boundary';

// ✅ Lazy load the heavy client view component
const ProductsClientView = dynamic(
  () => import('./_components/products-client-view').then(mod => mod.ProductsClientView),
  { 
    loading: () => <div className="p-8 animate-pulse text-slate-400">Chargement de l'interface stock...</div>,
    ssr: true 
  }
);

/**
 * Async component to fetch products in isolation
 */
async function ProductsDataWrapper({ userId }: { userId: string }) {
    // Parallel fetching for this specific block
    const [productsResult, categoriesResult, usageStats] = await Promise.all([
        getProducts(),
        getCategories(),
        getClientUsageStats(userId)
    ]);

    const products = productsResult.success && productsResult.data ? productsResult.data : [];
    const categories = categoriesResult.success && categoriesResult.data ? categoriesResult.data : [];

    return (
        <ProductsClientView 
            initialProducts={products as ProductWithRelations[]} 
            initialCategories={categories} 
            usageStats={{
                products: usageStats.products.count,
                maxProducts: usageStats.products.limit
            }}
        />
    );
}

export default async function ProductsPage() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect('/login');
    }

    return (
        <div className="container mx-auto">
            <ErrorBoundary>
                <Suspense fallback={<div className="p-8 space-y-4">
                    <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
                    <div className="h-64 w-full bg-slate-100 rounded animate-pulse" />
                </div>}>
                    <ProductsDataWrapper userId={userId} />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
