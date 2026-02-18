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
    supplierName: string;
}

export function SupplierProductsTab({ supplierName }: ProductsTabProps) {
    const { data: products, isLoading, error } = useQuery({
        queryKey: ['supplier-products', supplierName],
        queryFn: () => getSupplierProductsAction(supplierName),
        enabled: !!supplierName
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
                    <Package className="h-5 w-5 text-blue-500" />
                    Produits en Stock (Catalogue)
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
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 opacity-20" />
                                        <p>Aucun produit trouvé pour ce nom de fournisseur dans le stock.</p>
                                        <p className="text-xs">Vérifiez que le champ "Fournisseur" dans la fiche produit correspond à "{supplierName}".</p>
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
