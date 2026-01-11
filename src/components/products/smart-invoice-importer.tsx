'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, Check, X, Loader2, Image as ImageIcon } from 'lucide-react';
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

// Compress image if larger than 2MB
const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions (max 1920px width)
                const maxWidth = 1920;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to Base64 JPEG with quality 0.8
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(base64);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

// Convert file to Base64 (for small files or PDFs)
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Mock AI analysis function - simulates OpenAI Vision API
const analyzeInvoice = async (base64Image: string): Promise<ParsedProduct[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Mock: In production, this would be:
    // const response = await fetch('/api/analyze-invoice', {
    //   method: 'POST',
    //   body: JSON.stringify({ image: base64Image })
    // });
    // return response.json();

    // Return mock parsed data
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
        },
        {
            reference: 'BELLA',
            nomProduit: 'BELLA Vue',
            marque: 'FASHION OPTICS',
            couleur: 'Bordeaux',
            categorie: 'Vue',
            prixAchat: 38.00,
            quantite: 2
        }
    ];
};

export function SmartInvoiceImporter() {
    const [open, setOpen] = React.useState(false);
    const [file, setFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [parsedProducts, setParsedProducts] = React.useState<ParsedProduct[]>([]);
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const { user } = useFirebase();
    const firestore = useFirestore();

    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile);

        // Create local preview (blob URL - no storage)
        const previewBlob = URL.createObjectURL(selectedFile);
        setPreviewUrl(previewBlob);

        // Start processing
        setIsProcessing(true);

        try {
            let base64Image: string;
            const fileSizeMB = selectedFile.size / (1024 * 1024);

            if (selectedFile.type.startsWith('image/') && fileSizeMB > 2) {
                // Compress large images
                console.log(`Image size: ${fileSizeMB.toFixed(2)}MB - compressing...`);
                base64Image = await compressImage(selectedFile);
            } else {
                // Use original for small files or PDFs
                base64Image = await fileToBase64(selectedFile);
            }

            // Analyze with mock AI
            const results = await analyzeInvoice(base64Image);
            setParsedProducts(results);

            // Clear base64 from memory immediately
            base64Image = '';
        } catch (error) {
            console.error('Error processing invoice:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelect(selectedFile);
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

            // Cleanup and close
            cleanupResources();
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

    const cleanupResources = () => {
        // Revoke preview URL to free memory
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        setParsedProducts([]);
        setFile(null);
    };

    const resetDialog = () => {
        cleanupResources();
    };

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) cleanupResources();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                        Importer via IA
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Import Intelligent via IA
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Upload Area */}
                    {!file && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-purple-300 rounded-lg p-12 text-center hover:border-purple-400 transition-colors cursor-pointer bg-gradient-to-b from-purple-50/50 to-white"
                        >
                            <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                                <Upload className="h-8 w-8 text-purple-600" />
                            </div>
                            <p className="text-lg font-medium text-slate-700 mb-2">
                                Télécharger une facture fournisseur
                            </p>
                            <p className="text-sm text-slate-500 mb-1">
                                JPG, PNG ou PDF (Max 10MB)
                            </p>
                            <p className="text-xs text-purple-600 font-medium">
                                ⚡ Traitement 100% en mémoire - Aucun stockage
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

                    {/* Preview + Processing State */}
                    {file && (
                        <div className="space-y-4">
                            {/* Preview */}
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                {previewUrl && (
                                    <div className="h-24 w-24 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 truncate">{file.name}</p>
                                    <p className="text-sm text-slate-500">
                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                    {file.size > 2 * 1024 * 1024 && (
                                        <Badge variant="secondary" className="mt-2 text-xs">
                                            Compression automatique activée
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetDialog}
                                    disabled={isProcessing}
                                >
                                    Changer
                                </Button>
                            </div>

                            {/* Processing */}
                            {isProcessing && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                                        <div>
                                            <p className="font-medium text-purple-900">Analyse en cours...</p>
                                            <p className="text-sm text-purple-700">Ne fermez pas cette fenêtre</p>
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
                            {!isProcessing && parsedProducts.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-600" />
                                            <p className="font-medium text-green-900">
                                                {parsedProducts.length} produits détectés par l'IA
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={resetDialog}
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
                                                resetDialog();
                                                setOpen(false);
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            onClick={handleImport}
                                            disabled={isImporting}
                                            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
