'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import type { Product } from '@/lib/types';
import { ProductForm } from '@/app/produits/_components/product-form';
import { BackButton } from '@/components/ui/back-button';

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;
    const firestore = useFirestore();
    const { user } = useFirebase();

    const [product, setProduct] = React.useState<Product | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        async function fetchProduct() {
            if (!firestore || !user || !productId) return;

            try {
                setIsLoading(true);
                const productRef = doc(firestore, `stores/${user.uid}/products`, productId);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const productData = { id: productSnap.id, ...productSnap.data() } as Product;
                    setProduct(productData);
                } else {
                    setError('Produit non trouvé');
                }
            } catch (err) {
                console.error('Error fetching product:', err);
                setError('Erreur lors du chargement du produit');
            } finally {
                setIsLoading(false);
            }
        }

        fetchProduct();
    }, [firestore, user, productId]);

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (error || !product) {
        return (
            <div className="flex flex-1 flex-col gap-6">
                <div className="w-fit">
                    <BackButton />
                </div>
                <div className="p-8 text-center text-red-600">
                    {error || 'Produit non trouvé'}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* Back Button */}
            <div className="w-fit">
                <BackButton />
            </div>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Modifier le Produit</h1>
                <p className="text-slate-600 mt-1">Mettre à jour les informations de {product.nomProduit}</p>
            </div>

            {/* Product Form */}
            <ProductForm product={product} />
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
                <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
    );
}
