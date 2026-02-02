import * as React from 'react';
import { getProduct } from '@/app/actions/products-actions';
import { ProductForm } from '@/app/produits/_components/product-form';
import { BackButton } from '@/components/ui/back-button';
import { redirect } from 'next/navigation';

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const productId = params.id;

    // Fetch product with Server Action
    const result = await getProduct(productId);

    if (!result.success || !result.data) {
        return (
            <div className="flex flex-1 flex-col gap-6">
                <div className="w-fit">
                    <BackButton />
                </div>
                <div className="p-8 text-center text-red-600">
                    {result.error || 'Produit non trouvé'}
                </div>
            </div>
        );
    }

    const product = result.data;

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
