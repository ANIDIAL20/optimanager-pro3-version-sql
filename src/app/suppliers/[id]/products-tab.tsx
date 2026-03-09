'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupplierProductsAction } from '@/app/actions/supplier-statement';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertCircle } from 'lucide-react';
import { SensitiveData } from '@/components/ui/sensitive-data';

interface ProductsTabProps {
    supplierId: string;
}

export function SupplierProductsTab({ supplierId }: ProductsTabProps) {
    const { data: products, isLoading, error } = useQuery({
        queryKey: ['supplier-products', supplierId],
        queryFn: () => getSupplierProductsAction(supplierId),
        enabled: !!supplierId
    });

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement du catalogue...</div>;
    
    if (error) return (
        <div className="p-8 text-center text-red-500 border border-red-100 bg-red-50 rounded-lg">
            Une erreur est survenue lors du chargement des produits.
        </div>
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-500" />
                    Catalogue des Produits (Stock)
                </CardTitle>
                <Badge variant="outline">{products?.length || 0} références</Badge>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Référence</TableHead>
                            <TableHead>Désignation</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead className="text-right">Prix Achat</TableHead>
                            <TableHead className="text-right">En Stock</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!products || products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <Package className="h-10 w-10 opacity-20 mb-2" />
                                        <p className="font-semibold text-slate-600">Aucun produit référencé</p>
                                        <p className="text-xs max-w-sm mx-auto">
                                            Les produits apparaissent ici dès qu'ils sont liés à ce fournisseur dans vos bons de commande ou réceptions de marchandises.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((p: any) => (
                                <TableRow key={p.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                                    <TableCell className="font-mono text-xs font-bold">{p.reference || '-'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{p.nom || p.designation}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{p.marque} {p.modele}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[10px]">{p.categorie || p.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        <SensitiveData value={Number(p.prixAchat || 0)} type="currency" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={p.quantiteStock <= (p.seuilAlerte || 0) ? 'text-red-600 font-bold' : ''}>
                                                {p.quantiteStock}
                                            </span>
                                            {p.quantiteStock <= (p.seuilAlerte || 0) && (
                                                <span className="text-[9px] text-red-500 font-medium">Stock faible</span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
