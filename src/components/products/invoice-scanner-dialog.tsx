'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Scan, Upload, CheckCircle, Trash2, FileText } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { useToast } from '@/hooks/use-toast';
// TODO: Migrate to SQL products actions
// import { useFirestore, useFirebase } from '@/firebase';
// import { collection, writeBatch, doc } from 'firebase/firestore';

interface ExtractedProduct {
    name: string;
    quantity: number | null;
    unitPrice: number | null;
    total: number | null;
}

interface InvoiceData {
    invoiceNumber: string | null;
    date: string | null;
    vendor: string | null;
    total: number | null;
    currency: string | null;
    products: ExtractedProduct[];
}

export function InvoiceScannerDialog() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [ocrText, setOcrText] = React.useState<string>('');
    const [invoiceData, setInvoiceData] = React.useState<InvoiceData | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    // const firestore = useFirestore();
    // const { user } = useFirebase();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPreviewUrl(URL.createObjectURL(file));
        setOcrText('');
        setInvoiceData(null);
    };

    const handleScan = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        setIsProcessing(true);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result as string;

                // Step 1: OCR with Tesseract
                toast({
                    title: "OCR en cours...",
                    description: "Extraction du texte de l'image",
                });

                const ocrResponse = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64 })
                });

                const ocrResult = await ocrResponse.json();

                if (!ocrResult.success) {
                    throw new Error(ocrResult.error || "Échec de l'OCR");
                }

                const extractedText = ocrResult.text;
                setOcrText(extractedText);

                // Step 2: AI Parsing with Groq
                toast({
                    title: "Analyse IA en cours...",
                    description: "Extraction des données structurées",
                });

                const aiResponse = await fetch('/api/invoice-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: extractedText })
                });

                const aiResult = await aiResponse.json();

                if (!aiResult.success) {
                    throw new Error(aiResult.error || "Échec de l'analyse automatique");
                }

                setInvoiceData(aiResult.data);
                toast({
                    title: "Analyse terminée",
                    description: `${aiResult.data.products?.length || 0} produits identifiés`,
                });
            };
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: error.message || "Erreur lors du traitement",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        // TODO: Implement SQL-based product import
        toast({
            title: "Fonctionnalité en cours de migration",
            description: "L'importation de factures sera bientôt disponible.",
        });
        return;
        
        /* Firebase version - to be replaced
        if (!firestore || !user || !invoiceData || invoiceData.products.length === 0) return;
        setIsSaving(true);

        try {
            const batch = writeBatch(firestore);
            const productsRef = collection(firestore, `stores/${user.uid}/products`);

            invoiceData.products.forEach(item => {
                const newDoc = doc(productsRef);
                batch.set(newDoc, {
                    reference: `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    nomProduit: item.name,
                    marqueId: 'generic',
                    categorieId: 'accessoires',
                    couleur: '',
                    quantiteStock: item.quantity || 1,
                    prixAchat: item.unitPrice || 0,
                    prixVente: (item.unitPrice || 0) * 2.5,
                    createdAt: new Date().toISOString(),
                });
            });

            await batch.commit();

            toast({
                title: "Import réussi",
                description: `${invoiceData.products.length} produits ajoutés au stock.`,
            });
            setIsOpen(false);
            setInvoiceData(null);
            setOcrText('');
            setPreviewUrl(null);

            window.location.reload();

        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erreur sauvegarde",
                description: "Impossible d'enregistrer les produits.",
            });
        } finally {
            setIsSaving(false);
        }
        */
    };

    const updateProduct = (index: number, field: keyof ExtractedProduct, value: any) => {
        if (!invoiceData) return;
        const newProducts = [...invoiceData.products];
        newProducts[index] = { ...newProducts[index], [field]: value };
        setInvoiceData({ ...invoiceData, products: newProducts });
    };

    const removeProduct = (index: number) => {
        if (!invoiceData) return;
        setInvoiceData({
            ...invoiceData,
            products: invoiceData.products.filter((_, i) => i !== index)
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md gap-2">
                    <Scan className="h-4 w-4" />
                    Scanner Facture
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Scanner Facture Fournisseur</DialogTitle>
                    <DialogDescription>
                        Importez une facture pour ajouter automatiquement les produits au stock.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                    {/* Left: Upload & Preview */}
                    <div className="space-y-4">
                        <Label>Image Facture</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        {previewUrl && (
                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-slate-100">
                                <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                            </div>
                        )}
                        <Button
                            className="w-full"
                            onClick={handleScan}
                            disabled={isProcessing || !previewUrl}
                        >
                            {isProcessing ? <BrandLoader size="xs" className="mr-2 inline-flex" /> : <Scan className="mr-2" />}
                            {isProcessing ? 'Traitement...' : 'Scanner'}
                        </Button>

                        {/* OCR Text Debug */}
                        {ocrText && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Voir le texte OCR
                                </summary>
                                <Textarea
                                    value={ocrText}
                                    readOnly
                                    className="mt-2 h-32 text-xs font-mono"
                                />
                            </details>
                        )}
                    </div>

                    {/* Right: Results Table */}
                    <div className="md:col-span-2 space-y-4">
                        <Label>Produits Identifiés ({invoiceData?.products.length || 0})</Label>
                        <div className="border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b sticky top-0">
                                    <tr>
                                        <th className="p-2">Nom</th>
                                        <th className="p-2 w-16">Qté</th>
                                        <th className="p-2 w-20">Prix U.</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!invoiceData || invoiceData.products.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                Aucun produit scanné.
                                            </td>
                                        </tr>
                                    ) : (
                                        invoiceData.products.map((item, i) => (
                                            <tr key={i} className="border-b hover:bg-slate-50">
                                                <td className="p-2">
                                                    <Input
                                                        value={item.name}
                                                        onChange={(e) => updateProduct(i, 'name', e.target.value)}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        value={item.quantity || ''}
                                                        onChange={(e) => updateProduct(i, 'quantity', parseInt(e.target.value) || null)}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        value={item.unitPrice || ''}
                                                        onChange={(e) => updateProduct(i, 'unitPrice', parseFloat(e.target.value) || null)}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeProduct(i)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Fermer</Button>
                    <Button onClick={handleSave} disabled={isSaving || !invoiceData || invoiceData.products.length === 0} className="bg-green-600 hover:bg-green-700">
                        {isSaving ? <BrandLoader size="xs" className="mr-2 inline-flex" /> : <CheckCircle className="mr-2" />}
                        Confirmer Import
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
