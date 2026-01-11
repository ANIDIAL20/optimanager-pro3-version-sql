'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Check, X, Loader2 } from 'lucide-react';
import { useFirebase, useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface ParsedProduct {
    reference: string;
    nomProduit: string;
    marque: string;
    couleur?: string;
    categorie: string;
    prixAchat: number;
    quantite: number;
}

// Mock AI parsing function - simulates invoice analysis
const parseInvoiceImage = async (file: File): Promise<ParsedProduct[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock data
    return [
        {
            reference: 'SOREN',
            nomProduit: 'SOREN Solaire',
            marque: 'FRENCH RETRO',
            couleur: 'G9',
            categorie: 'Solaire',
            prixAchat: 45.00,
            quantite: 2
        },
        {
            reference: 'GINO',
            nomProduit: 'GINO Solaire',
            marque: 'FRENCH RETRO',
            couleur: 'G122',
            categorie: 'Solaire',
            prixAchat: 48.00,
            quantite: 1
        },
        {
            reference: 'MARCO',
            nomProduit: 'MARCO Vue',
            marque: 'ITALIAN DESIGN',
            couleur: 'Noir',
            categorie: 'Vue',
            prixAchat: 52.00,
            quantite: 3
        }
    ];
};

export function InvoiceImportDialog() {
    const [open, setOpen] = React.useState(false);
    const [file, setFile] = React.useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [parsedProducts, setParsedProducts] = React.useState<ParsedProduct[]>([]);
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const { user } = useFirebase();
    const firestore = useFirestore();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            handleAnalyze(selectedFile);
        }
    };

    const handleAnalyze = async (fileToAnalyze: File) => {
        setIsAnalyzing(true);
        try {
            const results = await parseInvoiceImage(fileToAnalyze);
            setParsedProducts(results);
        } catch (error) {
            console.error('Error analyzing invoice:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImport = async () => {
        if (!user || !firestore || parsedProducts.length === 0) return;

        setIsImporting(true);
        try {
            const batch = writeBatch(firestore);

            parsedProducts.forEach((product) => {
                const productRef = doc(collection(firestore, `stores/${user.uid}/products`));
                batch.set(productRef, {
                    reference: product.reference,
                    nomProduit: product.nomProduit,
                    prixAchat: product.prixAchat,
                    prixVente: product.prixAchat * 2.5, // Default markup
                    quantiteStock: product.quantite,
                    categorieId: product.categorie,
                    marqueId: product.marque,
                    couleurId: product.couleur || '',
                    createdAt: new Date().toISOString(),
                });
            });

            await batch.commit();

            // Reset and close
            setParsedProducts([]);
            setFile(null);
            setOpen(false);
        } catch (error) {
            console.error('Error importing products:', error);
        } finally {
            setIsImporting(false);
        }
    };

    const updateProduct = (index: number, field: keyof ParsedProduct, value: string | number) => {
        setParsedProducts(prev => prev.map((p, i) =>
            i === index ? { ...p, [field]: value } : p
        ));
    };

    const removeProduct = (index: number) => {
        setParsedProducts(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Scanner Facture
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import via Facture Fournisseur</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Upload Area */}
                    {!file && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-slate-400 transition-colors cursor-pointer"
                        >
                            <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-lg font-medium text-slate-700 mb-2">
                                Télécharger une facture
                            </p>
                            <p className="text-sm text-slate-500">
                                JPG, PNG ou PDF (Max 10MB)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Analyzing State */}
                    {file && isAnalyzing && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                                <div>
                                    <p className="font-medium text-blue-900">Analyse de la facture par l'IA...</p>
                                    <p className="text-sm text-blue-700">Extraction des produits en cours</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </div>
                    )}

                    {/* Results Table */}
                    {file && !isAnalyzing && parsedProducts.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-green-600" />
                                    <p className="font-medium text-green-900">
                                        {parsedProducts.length} produits détectés
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFile(null);
                                        setParsedProducts([]);
                                    }}
                                >
                                    Nouvelle facture
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Référence</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Marque</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Couleur</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Catégorie</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Prix Achat</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Qté</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {parsedProducts.map((product, index) => (
                                                <tr key={index} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            value={product.reference}
                                                            onChange={(e) => updateProduct(index, 'reference', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            value={product.marque}
                                                            onChange={(e) => updateProduct(index, 'marque', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            value={product.couleur || ''}
                                                            onChange={(e) => updateProduct(index, 'couleur', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="secondary">{product.categorie}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="number"
                                                            value={product.prixAchat}
                                                            onChange={(e) => updateProduct(index, 'prixAchat', parseFloat(e.target.value) || 0)}
                                                            className="h-8 w-24"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="number"
                                                            value={product.quantite}
                                                            onChange={(e) => updateProduct(index, 'quantite', parseInt(e.target.value) || 0)}
                                                            className="h-8 w-16"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeProduct(index)}
                                                        >
                                                            <X className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setFile(null);
                                        setParsedProducts([]);
                                        setOpen(false);
                                    }}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={isImporting}
                                    className="gap-2"
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Import en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Confirmer l'Import ({parsedProducts.length})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
