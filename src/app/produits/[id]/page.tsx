'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, Package, TrendingUp, DollarSign, Layers, Pencil } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { StockUpdateDialog } from '@/components/dashboard/produits/stock-update-dialog';
import { BackButton } from '@/components/ui/back-button';
import { getProduct } from '@/app/actions/products-actions';

interface Product {
    id: string;
    name?: string;
    nomProduit?: string;
    reference: string;
    category?: string;
    categorie?: string;
    categorieId?: string;
    brand?: string;
    marque?: string;
    marqueId?: string;
    purchasePrice?: string | number;
    prixAchat?: number;
    salePrice?: string | number;
    prixVente?: number;
    stock?: number;
    quantiteStock?: number;
    minStock?: number;
    stockMin?: number;
    seuilAlerte?: number;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export default function ProductDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = params.id as string;

    const [product, setProduct] = React.useState<Product | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [showStockDialog, setShowStockDialog] = React.useState(false);

    // Check for auto-open stock dialog from query params
    React.useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'edit-stock' && product) {
            setShowStockDialog(true);
            // Clean up URL
            router.replace(`/produits/${productId}`, { scroll: false });
        }
    }, [searchParams, product, productId, router]);

    const fetchProduct = React.useCallback(async () => {
        if (!productId) return;

        try {
            setIsLoading(true);
            const result = await getProduct(productId);

            if (result.success && result.data) {
                setProduct(result.data as Product);
            } else {
                setError(result.error || 'Produit non trouvé');
            }
        } catch (err) {
            console.error('Error fetching product:', err);
            setError('Erreur lors du chargement du produit');
        } finally {
            setIsLoading(false);
        }
    }, [productId]);

    React.useEffect(() => {
        fetchProduct();
    }, [fetchProduct]);

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (error || !product) {
        return (
            <div className="flex flex-1 flex-col gap-6">
                <div className="w-fit">
                    <BackButton />
                </div>
                <Card className="p-8">
                    <div className="text-center text-red-600">
                        {error || 'Produit non trouvé'}
                    </div>
                </Card>
            </div>
        );
    }

    // Normalize product fields to handle both old and new formats
    const productName = product.nomProduit || product.name || '';
    const prixVente = Number(product.prixVente || product.salePrice || 0);
    const prixAchat = Number(product.prixAchat || product.purchasePrice || 0);
    const quantiteStock = product.quantiteStock ?? product.stock ?? 0;
    const stockMin = product.stockMin || product.minStock || product.seuilAlerte || 0;
    const brandName = product.marque || product.brand || product.marqueId || '-';
    const categoryName = product.categorie || product.category || product.categorieId || '-';

    const stockStatus = quantiteStock < 3 ? 'critical' : quantiteStock < 10 ? 'low' : 'good';

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* Back Button */}
            <div className="w-fit">
                <BackButton />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{productName}</h1>
                    <p className="text-slate-600 mt-1">Référence: {product.reference}</p>
                </div>
                <Button asChild>
                    <Link href={`/produits/${productId}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                    </Link>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Prix de Vente</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{prixVente.toFixed(2)} MAD</h3>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Prix d'Achat</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{prixAchat.toFixed(2)} MAD</h3>
                        {prixAchat > 0 && (
                            <p className="text-xs text-emerald-600">
                                Marge: {((prixVente - prixAchat) / prixAchat * 100).toFixed(0)}%
                            </p>
                        )}
                    </div>
                </SpotlightCard>

                <SpotlightCard
                    className={cn("p-6", stockStatus === 'critical' && "ring-2 ring-red-500/50")}
                    spotlightColor={stockStatus === 'critical' ? "rgba(239, 68, 68, 0.15)" : "rgba(139, 92, 246, 0.15)"}
                >
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Stock</p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setShowStockDialog(true)}
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center",
                                    stockStatus === 'critical' ? "bg-red-100" : "bg-purple-500"
                                )}>
                                    <Package className={cn("h-4 w-4", stockStatus === 'critical' ? "text-red-600" : "text-white")} />
                                </div>
                            </div>
                        </div>
                        <h3 className={cn(
                            "text-2xl font-bold",
                            stockStatus === 'critical' ? "text-red-600" : "text-slate-900"
                        )}>
                            {quantiteStock}
                        </h3>
                        {stockMin > 0 && (
                            <p className="text-xs text-slate-500">Min: {stockMin}</p>
                        )}
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-6" spotlightColor="rgba(249, 115, 22, 0.15)">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600">Valeur Stock</p>
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                                <Layers className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {(prixVente * quantiteStock).toFixed(2)} MAD
                        </h3>
                    </div>
                </SpotlightCard>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Informations Générales</CardTitle>
                        <CardDescription>Détails du produit</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Référence</p>
                                <p className="text-lg font-semibold text-slate-900">{product.reference}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Nom du Produit</p>
                                <p className="text-lg font-semibold text-slate-900">{productName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Marque</p>
                                <p className="text-lg font-semibold text-slate-900">{brandName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Catégorie</p>
                                <p className="text-lg font-semibold text-slate-900">{categoryName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Créé le</p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString('fr-FR') : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Mis à jour le</p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('fr-FR') : '-'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Prix & Stock</CardTitle>
                        <CardDescription>Informations commerciales</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Prix d'Achat</p>
                                <p className="text-lg font-semibold text-slate-900">{prixAchat.toFixed(2)} MAD</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Prix de Vente</p>
                                <p className="text-lg font-semibold text-slate-900">{prixVente.toFixed(2)} MAD</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Quantité en Stock</p>
                                <div className="flex items-center gap-2">
                                    <p className={cn(
                                        "text-lg font-semibold",
                                        stockStatus === 'critical' ? 'text-red-600' : stockStatus === 'low' ? 'text-orange-600' : 'text-green-600'
                                    )}>
                                        {quantiteStock}
                                    </p>
                                    {stockStatus === 'critical' && (
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            Critique
                                        </Badge>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowStockDialog(true)}
                                        className="ml-auto"
                                    >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Ajuster
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Stock Minimum</p>
                                <p className="text-lg font-semibold text-slate-900">{stockMin || '-'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Description */}
            {product.description && (
                <Card>
                    <CardHeader>
                        <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-700">{product.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Stock Update Dialog */}
            <StockUpdateDialog
                product={product as any}
                open={showStockDialog}
                onOpenChange={setShowStockDialog}
                onStockUpdated={fetchProduct}
            />
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-6">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        </div>
    );
}
