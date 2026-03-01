'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { 
    Scan, 
    Upload, 
    CheckCircle, 
    Trash2, 
    FileText, 
    Sparkles, 
    ScanEye, 
    X,
    AlertCircle,
    PackagePlus,
    PlusCircle,
    UploadCloud,
    Copy,
    ArrowDownToLine,
    LayoutGrid,
    Truck,
    Info,
    ChevronUp,
    ChevronDown,
    Loader2
} from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BrandLoader } from '@/components/ui/loader-brand';
import { useToast } from '@/hooks/use-toast';
import { createBulkProducts } from '@/app/actions/products-actions';
import { getBrands, getCategories, getMaterials, getColors, createSetting } from '@/app/actions/settings-actions';
import { getSuppliersList, createSupplier } from '@/app/actions/supplier-actions';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Brand, Category, Material, Color, Supplier } from '@/lib/types';
import { processAIScanResult } from '@/features/invoice-scanner/utils/process-scan-result';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Schema Definition (Matching Manual Form) ---

const ProductItemSchema = z.object({
  reference: z.string().optional(),
  nomProduit: z.string().min(1, 'Nom requis.'),
  categorieId: z.string().min(1, 'Catégorie requise.'),
  marqueId: z.string().optional(),
  matiereId: z.string().optional(),
  couleurId: z.string().optional(),
  prixAchat: z.coerce.number().optional().default(0),
  isAchatTTC: z.boolean().default(false).optional(),
  prixVente: z.coerce.number().min(0, 'Prix requis.'),
  quantiteStock: z.coerce.number().min(0, 'Qte requise.'),
  stockMin: z.coerce.number().optional().default(0),
  description: z.string().optional(),
  details: z.string().optional(),
  imageUrl: z.string().optional(),
  isNameGenerated: z.boolean().optional().default(false),
});

const ScannerFormSchema = z.object({
    fournisseurId: z.string().optional(),
    numFacture: z.string().optional(),
    dateAchat: z.string().optional(),
    items: z.array(ProductItemSchema)
});

type ScannerFormValues = z.infer<typeof ScannerFormSchema>;

export function InvoiceScannerDialog() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [ocrText, setOcrText] = React.useState<string>('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Settings State
    const [brands, setBrands] = React.useState<Brand[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [materials, setMaterials] = React.useState<Material[]>([]);
    const [colors, setColors] = React.useState<Color[]>([]);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [isCreatingSetting, setIsCreatingSetting] = React.useState(false);
    const router = useRouter();

    // Form
    const form = useForm<ScannerFormValues>({
        resolver: zodResolver(ScannerFormSchema),
        mode: 'onChange', // P0: Real-time validation
        defaultValues: {
            fournisseurId: '',
            numFacture: '',
            dateAchat: new Date().toISOString().split('T')[0],
            items: []
        },
    });

    const { fields, append, remove, insert, replace } = useFieldArray({
        control: form.control,
        name: "items",
    });

    // Load Settings
    React.useEffect(() => {
        if (isOpen) {
            const loadSettings = async () => {
                try {
                    const [b, c, m, col, supp] = await Promise.all([
                        getBrands(),
                        getCategories(),
                        getMaterials(),
                        getColors(),
                        getSuppliersList()
                    ]);
                    
                    setBrands(b.data?.map((x: any) => ({ ...x, id: x.id.toString() })) || []);
                    setCategories(c.data?.map((x: any) => ({ ...x, id: x.id.toString() })) || []);
                    setMaterials(m.data?.map((x: any) => ({ ...x, id: x.id.toString() })) || []);
                    setColors(col.data?.map((x: any) => ({ ...x, id: x.id.toString() })) || []);
                    setSuppliers(supp.data?.map((x: any) => ({ ...x, id: x.id.toString() })) || []);
                } catch (e) {
                    console.error("Failed to load settings", e);
                }
            };
            loadSettings();
        }
    }, [isOpen]);

    // P0: Keyboard Shortcuts
    React.useEffect(() => {
        if (!isOpen) return;
        
        const handleKeys = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
            }
        };

        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isPdf = file.type === 'application/pdf';
            if (isPdf) {
                setPreviewUrl('pdf-marker:' + file.name);
            } else {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
            }
            // Reset form items but keep header info if any
            replace([]); 
        }
    };

    const handleQuickCreate = async (type: string, name: string, setList: any, fieldPath: any) => {
        if (!name.trim()) return;
        setIsCreatingSetting(true);
        try {
          const created = await createSetting(type as any, { name: name.trim() });
          if (created) {
            const newItem = { ...created, id: created.id.toString() };
            setList((prev: any) => [...prev, newItem]);
            form.setValue(fieldPath, newItem.id);
            toast({ title: "Ajouté !", description: `${name} a été ajouté.` });
          }
        } catch (error) {
          toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer l'élément." });
        } finally {
            setIsCreatingSetting(false);
        }
    };

    const handleScan = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            toast({ variant: "destructive", title: "Document manquant", description: "Veuillez sélectionner une image." });
            return;
        }

        setIsProcessing(true);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = reader.result as string;
                    const aiResponse = await fetch('/api/invoice-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: base64 })
                    });
                    const aiResult = await aiResponse.json();

                    if (!aiResult.success) throw new Error(aiResult.error || "Échec de l'analyse");

                    const invoiceData = aiResult.data;
                    
                    // --- AUTO-CREATE ENTITIES ---
                    
                    // 1. Supplier
                    let supplierId = '';
                    if (invoiceData.supplierName) {
                        const existingSupplier = suppliers.find(s => 
                            s.name.toLowerCase().includes(invoiceData.supplierName.toLowerCase()) ||
                            invoiceData.supplierName.toLowerCase().includes(s.name.toLowerCase())
                        );
                        if (existingSupplier) {
                            supplierId = existingSupplier.id;
                        } else {
                            try {
                                const created = await createSupplier({ nomCommercial: invoiceData.supplierName, status: 'Actif' });
                                if (created) {
                                    const newSupp: Supplier = {
                                        id: created.id.toString(),
                                        userId: created.userId,
                                        name: created.name ?? invoiceData.supplierName ?? '',
                                        nomCommercial: created.name ?? invoiceData.supplierName ?? '',
                                        phone: created.phone ?? '',
                                        telephone: created.phone ?? '',
                                        email: created.email ?? '',
                                        address: created.address ?? '',
                                        adresse: created.address ?? '',
                                        city: created.city ?? '',
                                        ville: created.city ?? '',
                                        category: created.category ?? '',
                                        typeProduits: created.category ? created.category.split(', ') : [],
                                        ice: created.ice ?? '',
                                        if: created.if ?? '',
                                        rc: created.rc ?? '',
                                        taxId: created.taxId ?? '',
                                        paymentTerms: created.paymentTerms ?? '',
                                        paymentMethod: created.paymentMethod ?? '',
                                        bank: created.bank ?? '',
                                        banque: created.bank ?? '',
                                        rib: created.rib ?? '',
                                        notes: created.notes ?? '',
                                        status: created.status ?? 'Actif',
                                        statut: created.status ?? 'Actif',
                                        isActive: created.isActive ?? true,
                                        defaultTaxMode: created.defaultTaxMode ?? 'HT',
                                        currentBalance: Number(created.currentBalance || 0),
                                        createdAt: created.createdAt ?? new Date(),
                                        dateCreation: created.createdAt ?? new Date(),
                                        updatedAt: created.updatedAt ?? new Date(),
                                        dateModification: created.updatedAt ?? new Date()
                                    };
                                    setSuppliers(prev => [...prev, newSupp]);
                                    supplierId = newSupp.id;
                                    toast({ title: "Nouveau Fournisseur", description: `${invoiceData.supplierName} a été ajouté auto.` });
                                }
                            } catch (e) { console.error("Auto-supplier fail", e); }
                        }
                    }

                    // 2. Prepare for batch processing of product attributes
                    const uniqueCategories = Array.from(new Set(invoiceData.products?.map((p: any) => p.category).filter(Boolean))) as string[];
                    const uniqueBrands = Array.from(new Set(invoiceData.products?.map((p: any) => p.brand).filter(Boolean))) as string[];
                    // Optional: colors, materials if AI provides them

                    // Helper for Setting Creation
                    const findOrCreate = async (type: string, name: string, currentList: any[], setter: any) => {
                        if (!name) return '';
                        const existing = currentList.find(i => i.name.toLowerCase() === name.toLowerCase());
                        if (existing) return existing.id;
                        
                        try {
                            const created = await createSetting(type as any, { name });
                            if (created) {
                                const newItem = { ...created, id: created.id.toString() };
                                setter((prev: any) => [...prev, newItem]);
                                return newItem.id;
                            }
                        } catch (e) { console.error(`Auto-${type} fail`, e); }
                        return '';
                    };

                    // Process Categories first
                    const catMap: Record<string, string> = {};
                    for (const catName of uniqueCategories) {
                        catMap[catName] = await findOrCreate('categories', catName, categories, setCategories);
                    }

                    // Process Brands
                    const brandMap: Record<string, string> = {};
                    for (const brandName of uniqueBrands) {
                        brandMap[brandName] = await findOrCreate('brands', brandName, brands, setBrands);
                    }

                    // --- MAP DATA TO FORM ---
                    form.setValue('numFacture', invoiceData.invoiceNumber || '');
                    if (supplierId) form.setValue('fournisseurId', supplierId);
                    
                    if (invoiceData.date) {
                        try {
                            const parsedDate = new Date(invoiceData.date);
                            if (!isNaN(parsedDate.getTime())) {
                                const isoDate = parsedDate.toISOString().split('T')[0];
                                form.setValue('dateAchat', isoDate);
                            }
                        } catch (e) {}
                    }

                    const processedProducts = processAIScanResult(invoiceData.products || []);

                    const newItems = processedProducts.map((p: any) => ({
                        reference: p.reference || '', 
                        nomProduit: p.nomProduit,
                        categorieId: catMap[p.category] || '',
                        marqueId: brandMap[p.brand] || brandMap['Générique'] || brands.find(b => b.name === 'Générique')?.id || '',
                        matiereId: '',
                        couleurId: '',
                        prixAchat: p.unitPrice || 0,
                        isAchatTTC: false,
                        prixVente: (p.unitPrice || 0) * 1.5,
                        quantiteStock: p.quantity || 1,
                        stockMin: 0,
                        description: '',
                        details: '',
                        imageUrl: '',
                        isNameGenerated: p.isNameGenerated
                    })) || [];

                    replace(newItems);

                    toast({
                        title: "Analyse et Import Auto terminés ! 🚀",
                        description: `${newItems.length} produits extraits. Les nouveaux paramètres ont été créés.`,
                    });

                } catch (err: any) {
                    toast({ variant: "destructive", title: "Erreur", description: err.message });
                } finally {
                    setIsProcessing(true); // Keep processing state while toast is shown? No, use false.
                    setIsProcessing(false);
                }
            };
        } catch (error) {
            console.error(error);
            setIsProcessing(false);
        }
    };

    const onSubmit = async (data: ScannerFormValues) => {
        if (!data.items || data.items.length === 0) {
            toast({ variant: "destructive", title: "Erreur", description: "Aucun produit à enregistrer." });
            return;
        }

        setIsSaving(true);
        try {
             // 🛡️ Advanced Validation
             if (!data.fournisseurId) {
                 toast({ variant: "destructive", title: "Fournisseur Requis", description: "Veuillez sélectionner un fournisseur pour cette facture." });
                 setIsSaving(false);
                 return;
             }

             const invalidRows = data.items.filter(it => !it.nomProduit || !it.categorieId);
             if (invalidRows.length > 0) {
                 toast({ 
                     variant: "destructive", 
                     title: "Données Incomplètes", 
                     description: `Il y a ${invalidRows.length} produit(s) sans nom ou catégorie. Veuillez les corriger.` 
                 });
                 setIsSaving(false);
                 return;
             }
             
             // Map to API format (names instead of IDs for creation if needed, but here we pass IDs mostly)
             // Check API requirements: createBulkProducts expects names for category/brand usually if logic is there, 
             // but here we used IDs in the form. Let's see if update logic handles it.
             // Actually ProductForm maps IDs back to Names before sending.
             
             const apiItems = data.items.map(item => ({
                 ...item,
                 categorieId: item.categorieId, // The API might need ID or Name depending on implementaiton. 
                                                // Assuming keys match ProductInput interface
                 categorie: categories.find(c => c.id === item.categorieId)?.name,
                 marque: brands.find(b => b.id === item.marqueId)?.name,
                 fournisseur: suppliers.find(s => s.id === data.fournisseurId)?.name,
                 isActive: true
             }));

             const result = await createBulkProducts({
                items: apiItems as any,
                invoiceData: {
                    fournisseurId: data.fournisseurId,
                    numFacture: data.numFacture,
                    dateAchat: data.dateAchat ? new Date(data.dateAchat) : new Date()
                }
             });

             if (result.success) {
                 toast({ title: "Succès !", description: `${result.count} produits ajoutés.` });
                 setIsOpen(false);
                 setPreviewUrl(null);
                 form.reset();
                 replace([]);
             } else {
                 throw new Error(result.error);
             }

        } catch (error: any) {
            toast({ variant: "destructive", title: "Erreur de sauvegarde", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const applyToAll = (fieldName: any) => {
        const firstVal = form.getValues(`items.0.${fieldName}` as any);
        if (!firstVal) return;
        const currentItems = form.getValues().items;
        currentItems.forEach((_, index) => {
            form.setValue(`items.${index}.${fieldName}` as any, firstVal, { shouldValidate: true });
        });
        toast({ title: "Appliqué", description: `Valeur copiée sur ${currentItems.length} lignes.` });
    };

    const applyMarginToAll = (percent: number) => {
        const currentItems = form.getValues().items;
        currentItems.forEach((_, index) => {
            const buyingPrice = Number(form.getValues(`items.${index}.prixAchat` as any)) || 0;
            if (buyingPrice > 0) {
                const suggestedSelling = buyingPrice * (1 + percent / 100);
                form.setValue(`items.${index}.prixVente` as any, Math.round(suggestedSelling * 10) / 10, { shouldValidate: true });
            }
        });
        toast({ title: "Marge Appliquée", description: `Marge de ${percent}% appliquée à tous les produits.` });
    };

    const duplicateRow = (index: number) => {
        const item = form.getValues().items[index];
        insert(index + 1, { ...item, reference: '', nomProduit: item.nomProduit + ' (Copie)' });
    };

    const onAddRow = () => {
        append({
            reference: '', nomProduit: '', categorieId: '', marqueId: '', 
            matiereId: '', couleurId: '', prixAchat: 0, prixVente: 0, 
            quantiteStock: 1, stockMin: 0, isNameGenerated: false
        });
    };

    // P1: Duplicate Detection
    const duplicateMap = React.useMemo(() => {
        const map = new Map<string, number[]>();
        fields.forEach((item, index) => {
            if (!item.reference) return;
            const key = `${item.reference.trim().toUpperCase()}-${(item.couleurId || '').trim().toUpperCase()}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)?.push(index);
        });
        return map;
    }, [fields]);

    const duplicateCount = Array.from(duplicateMap.values()).filter(indices => indices.length > 1).length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
                setPreviewUrl(null);
                form.reset();
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }}>
            <DialogTrigger asChild>
                <Button 
                    size="default"
                    className="relative overflow-hidden group bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all duration-300 border-0 gap-2 px-5"
                >
                    <Sparkles className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    <span className="font-medium tracking-wide">Scanner IA</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                </Button>
            </DialogTrigger>
            <DialogContent 
                key={isOpen ? "open" : "closed"}
                className="max-w-[98vw] w-full h-[95vh] p-0 gap-0 bg-slate-50/50 backdrop-blur-xl border-slate-200/60 shadow-2xl overflow-hidden block [&>button:last-child]:hidden"
            >
                {/* 1. Header: Professional & Clean */}
                <div className="h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/50 flex items-center justify-between px-6 shrink-0 z-50">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50 shadow-sm">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-800 tracking-tight">
                                Importation Intelligente
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium text-slate-500">
                                Prévisualisation et validation des données extraites
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         {/* Global Actions could go here */}
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-9 w-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-row relative h-[calc(95vh-64px)]">
                    
                    {/* LEFT PANEL: Source Document (Fixed Width) */}
                    <div className="w-[380px] bg-slate-50/80 border-r border-slate-200/60 flex flex-col relative shrink-0 z-20">
                         <div className="p-5 flex flex-col h-full gap-5 overflow-y-auto">
                             
                             {/* Upload Zone */}
                             <div className="relative group w-full aspect-[21/29] rounded-2xl border-2 border-dashed border-slate-300/80 bg-white shadow-sm hover:border-indigo-400/50 hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
                                 onClick={(e) => {
                                    if (e.target !== fileInputRef.current) {
                                        fileInputRef.current?.click();
                                    }
                                 }}
                             >
                                {previewUrl ? (
                                    <div className="w-full h-full relative group/preview">
                                        <img src={previewUrl.startsWith('pdf-marker') ? '/pdf-placeholder.png' : previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                                        <div className="absolute inset-0 bg-slate-900/0 group-hover/preview:bg-slate-900/10 transition-colors flex items-center justify-center opacity-0 group-hover/preview:opacity-100">
                                            <Button variant="secondary" size="sm" className="shadow-lg transform translate-y-2 group-hover/preview:translate-y-0 transition-transform">
                                                Changer le fichier
                                            </Button>
                                        </div>
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setPreviewUrl(null); 
                                                replace([]);
                                            }}
                                            className="absolute top-3 right-3 p-1.5 bg-white/90 text-slate-500 rounded-full hover:bg-red-50 hover:text-red-600 shadow-sm border border-slate-100 transition-all opacity-0 group-hover/preview:opacity-100"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                                        <div className="h-16 w-16 rounded-full bg-indigo-50/50 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
                                            <UploadCloud className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-sm font-semibold text-slate-700">Glissez ou cliquez</p>
                                            <p className="text-xs text-slate-400">PDF, JPG, PNG (Max 10MB)</p>
                                        </div>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                            </div>

                            <Button 
                                size="lg"
                                className={cn(
                                    "w-full font-semibold shadow-lg transition-all duration-500",
                                    isProcessing 
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                        : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/25 text-white"
                                )} 
                                onClick={handleScan}
                                disabled={isProcessing || !previewUrl}
                            >
                                {isProcessing ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Analyse en cours...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <ScanEye className="h-5 w-5" />
                                        <span>Lancer l'extraction IA</span>
                                    </div>
                                )}
                            </Button>

                            {/* Metadata Card */}
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Détails Facture</span>
                                </div>
                                <Form {...form}>
                                    <div className="space-y-4">
                                        <FormField control={form.control} name="fournisseurId" render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-slate-500 uppercase">Fournisseur</Label>
                                                <SearchableSelect 
                                                    options={suppliers.map(s => ({ label: s.name, value: s.id }))} 
                                                    value={field.value} 
                                                    onChange={field.onChange} 
                                                    placeholder="Sélectionner..." 
                                                    className="h-9 w-full bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-sm" 
                                                />
                                            </FormItem>
                                        )} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField control={form.control} name="numFacture" render={({ field }) => (
                                                <FormItem className="space-y-1.5">
                                                    <Label className="text-[11px] font-semibold text-slate-500 uppercase">N° Pièce</Label>
                                                    <Input {...field} className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all font-mono text-sm" placeholder="FAC-..." />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="dateAchat" render={({ field }) => (
                                                <FormItem className="space-y-1.5">
                                                    <Label className="text-[11px] font-semibold text-slate-500 uppercase">Date</Label>
                                                    <Input type="date" {...field} className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-sm" />
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                </Form>
                            </div>
                         </div>
                    </div>

                    {/* RIGHT PANEL: Workspace (Flexible) */}
                    <div className="flex-1 bg-white flex flex-col min-w-0 z-10">
                        <TooltipProvider>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
                                
                                {/* Professional Toolbar */}
                                <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                            <PackagePlus className="h-4 w-4 text-indigo-500" />
                                            <span className="font-semibold text-slate-700">{fields.length}</span>
                                            <span className="text-slate-400">produits détectés</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 mr-2">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase px-2">Marge :</Label>
                                            {[20, 30, 40].map(pct => (
                                                <Button 
                                                    key={pct}
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] font-bold px-2 hover:bg-white hover:text-indigo-600 rounded"
                                                    onClick={() => applyMarginToAll(pct)}
                                                >
                                                    {pct}%
                                                </Button>
                                            ))}
                                        </div>

                                        <div className="h-8 w-px bg-slate-200 mx-1" />
                                        
                                        {duplicateCount > 0 && (
                                            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 animate-pulse">
                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                                <span className="text-[11px] font-bold text-amber-700">{duplicateCount} doublons</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs font-semibold text-slate-400 uppercase mr-1">Appliquer à tous :</Label>
                                            
                                            {/* Global HT/TTC Toggle */}
                                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 mr-2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const currentItems = form.getValues().items;
                                                        currentItems.forEach((_, index) => form.setValue(`items.${index}.isAchatTTC`, false));
                                                        toast({ title: "Action Groupée", description: "Mode HT appliqué à tous les produits.", className: "bg-indigo-950 text-white border-none" });
                                                    }}
                                                    className="text-[10px] font-bold px-2.5 py-1 rounded hover:bg-white hover:shadow-sm transition-all text-slate-600 uppercase"
                                                >
                                                    HT
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const currentItems = form.getValues().items;
                                                        currentItems.forEach((_, index) => form.setValue(`items.${index}.isAchatTTC`, true));
                                                        toast({ title: "Action Groupée", description: "Mode TTC appliqué à tous les produits.", className: "bg-indigo-950 text-white border-none" });
                                                    }}
                                                    className="text-[10px] font-bold px-2.5 py-1 rounded hover:bg-white hover:shadow-sm transition-all text-slate-600 uppercase"
                                                >
                                                    TTC
                                                </button>
                                            </div>

                                            <SearchableSelect 
                                                options={categories.map(c => ({ label: c.name, value: c.id }))} 
                                                placeholder="Catégorie..." 
                                                className="h-8 w-[160px] text-xs border-slate-200 shadow-none bg-slate-50 hover:bg-white transition-colors"
                                                onChange={(val) => {
                                                    const currentItems = form.getValues().items;
                                                    currentItems.forEach((_, index) => {
                                                        form.setValue(`items.${index}.categorieId`, val);
                                                    });
                                                    toast({ title: "Action Groupée", description: "Catégorie appliquée à tous les produits.", className: "bg-indigo-950 text-white border-none" });
                                                }}
                                            />
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => onAddRow()} className="h-8 text-xs font-medium border-dashed border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50">
                                            <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Ajouter
                                        </Button>
                                    </div>
                                </div>

                                {/* Table Grid */}
                                <div className="flex-1 relative bg-slate-50/50 overflow-hidden">
                                    <ScrollArea className="h-full w-full">
                                        {fields.length === 0 ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                                <div className="h-24 w-24 rounded-full bg-slate-50 border-4 border-dashed border-slate-200 flex items-center justify-center mb-6">
                                                    <Scan className="h-10 w-10 text-slate-300" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-600 mb-2">Espace de travail vide</h3>
                                                <p className="text-sm text-slate-400 max-w-xs text-center">Importez une facture ou ajoutez des produits manuellement pour commencer.</p>
                                            </div>
                                        ) : (
                                            <div className="min-w-[1000px] pb-20 overflow-visible">
                                                <Table className="border-separate border-spacing-0">
                                                    <TableHeader className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                                                        <TableRow className="border-none hover:bg-transparent">
                                                            <TableHead className="h-12 w-[60px] text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white">#</TableHead>
                                                            <TableHead className="h-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white pl-4">Identification Produit</TableHead>
                                                            <TableHead className="h-12 w-[220px] text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white">Classification</TableHead>
                                                            <TableHead className="h-12 w-[320px] text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white px-6">Données Financières</TableHead>
                                                            <TableHead className="h-12 w-[80px] text-center bg-white"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {fields.map((field, index) => (
                                                            <ScannerProductRow 
                                                                key={field.id} 
                                                                index={index} 
                                                                control={form.control} 
                                                                remove={remove} 
                                                                duplicate={duplicateRow}
                                                                brands={brands}
                                                                categories={categories}
                                                                materials={materials}
                                                                colors={colors}
                                                                handleQuickCreate={handleQuickCreate}
                                                                isCreatingSetting={isCreatingSetting}
                                                                setBrands={setBrands}
                                                                setCategories={setCategories}
                                                                setMaterials={setMaterials}
                                                                setColors={setColors}
                                                                duplicateMap={duplicateMap}
                                                            />
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                        <ScrollBar orientation="horizontal" className="z-50" />
                                        <ScrollBar orientation="vertical" className="z-50" />
                                    </ScrollArea>
                                </div>
                                {/* Footer Bar */}
                                <div className="h-20 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 z-40 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-500">
                                            <Info className="h-4 w-4" />
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            <p className="font-semibold text-slate-700">Vérification requise</p>
                                            <p>Les marges faibles (&lt;20%) sont surlignées en rouge.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            className="text-slate-500 hover:text-slate-800" 
                                            onClick={() => {
                                                form.reset();
                                                setPreviewUrl(null);
                                                replace([]);
                                                setIsOpen(false);
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            size="lg"
                                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-indigo-500/10 min-w-[180px] font-semibold"
                                            disabled={isSaving || fields.length === 0}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                            {isSaving ? 'Enregistrement...' : 'Valider & Importer'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </TooltipProvider>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);
}

// --- Scanner Product Row Component (Inline for simplicity) ---

function ScannerProductRow({ 
    index, control, remove, duplicate, brands, categories, materials, colors, handleQuickCreate, isCreatingSetting, setBrands, setCategories, setMaterials, setColors, duplicateMap
}: any) {
    const prixAchat = useWatch({ control, name: `items.${index}.prixAchat` });
    const prixVente = useWatch({ control, name: `items.${index}.prixVente` });
    const isAchatTTC = useWatch({ control, name: `items.${index}.isAchatTTC` });
    const nomProduit = useWatch({ control, name: `items.${index}.nomProduit` });
    const categorieId = useWatch({ control, name: `items.${index}.categorieId` });
    const marqueId = useWatch({ control, name: `items.${index}.marqueId` });
    const isNameGenerated = useWatch({ control, name: `items.${index}.isNameGenerated` });

    const valPrixAchat = Number(prixAchat) || 0;
    const valPrixVente = Number(prixVente) || 0;
    const cost = isAchatTTC ? (valPrixAchat / 1.2) : valPrixAchat;
    const margin = valPrixVente - cost;
    const marginPercent = valPrixVente > 0 ? (margin / valPrixVente) * 100 : 0;
    const isLowMargin = marginPercent < 20 && valPrixVente > 0;
    
    // Ghost Input Class
    const ghostInput = "h-auto py-1 px-2 text-sm border-transparent hover:border-slate-200 focus:border-indigo-400 bg-transparent hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:shadow-sm transition-all rounded";

    const key = `${(nomProduit || '').trim().toUpperCase()}-${(marqueId || '').trim().toUpperCase()}`;
    const isDuplicate = duplicateMap.has(key) && (duplicateMap.get(key)?.length || 0) > 1;

    return (
        <TableRow className={cn(
            "group hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0",
            index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
            isDuplicate && "bg-amber-50/50"
        )}>
            {/* 1. Index */}
            <TableCell className="text-center py-3 text-xs font-medium text-slate-300 group-hover:text-indigo-400">
                {String(index + 1).padStart(2, '0')}
            </TableCell>

            {/* 2. Main Identity */}
            <TableCell className="py-3 pl-4 align-top">
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                         <FormField control={control} name={`items.${index}.reference`} render={({ field }) => (
                            <FormControl>
                                <Input 
                                    placeholder="REF..." 
                                    {...field} 
                                    className="h-7 w-[90px] text-[11px] font-mono font-semibold uppercase tracking-tight bg-slate-100/50 border-slate-200 focus:bg-white" 
                                />
                            </FormControl>
                        )} />
                        <FormField control={control} name={`items.${index}.nomProduit`} render={({ field }) => (
                            <FormControl>
                                <div className="relative group/name flex items-center">
                                    <Input 
                                        placeholder="Désignation du produit..." 
                                        {...field} 
                                        className={cn(
                                            "h-7 text-sm font-semibold border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:shadow-sm bg-transparent px-1 min-w-[200px] pr-6", 
                                            !nomProduit && "bg-red-50 text-red-600 placeholder:text-red-300",
                                            isNameGenerated && "text-indigo-600"
                                        )} 
                                    />
                                    {isNameGenerated && (
                                        <Sparkles className="h-3 w-3 text-indigo-400 absolute right-1 pointer-events-none" />
                                    )}
                                </div>
                            </FormControl>
                        )} />
                    </div>
                </div>
            </TableCell>

            {/* 3. Classification (Category & Brand) */}
            <TableCell className="py-3 align-top">
                <div className="flex flex-col gap-2">
                    <FormField control={control} name={`items.${index}.marqueId`} render={({ field }) => (
                         <SearchableSelect 
                            options={brands.map((b: any) => ({ label: b.name, value: b.id }))} 
                            value={field.value} 
                            onChange={field.onChange} 
                            placeholder="Marque..." 
                            className="h-7 text-xs border-transparent hover:border-slate-200 bg-transparent hover:bg-white"
                            onCreateNew={(name) => handleQuickCreate('brands', name, setBrands, `items.${index}.marqueId`)} 
                            isCreating={isCreatingSetting} 
                        />
                    )} />
                    <FormField control={control} name={`items.${index}.categorieId`} render={({ field }) => (
                        <SearchableSelect 
                            options={categories.map((c: any) => ({ label: c.name, value: c.id }))} 
                            value={field.value} 
                            onChange={field.onChange} 
                            placeholder="Catégorie..." 
                            className={cn("h-7 text-xs border-transparent hover:border-slate-200 bg-transparent hover:bg-white", !categorieId && "text-red-500")}
                            onCreateNew={(name) => handleQuickCreate('categories', name, setCategories, `items.${index}.categorieId`)} 
                            isCreating={isCreatingSetting} 
                        />
                   )} />
                </div>
            </TableCell>

            {/* 4. Financial & Stock */}
            <TableCell className="py-3 px-6 align-top">
                <div className="flex gap-4 items-start">
                     <div className="flex-1 space-y-2">
                          {/* Cost */}
                          <div className="flex items-center justify-end gap-2">
                                <FormField control={control} name={`items.${index}.isAchatTTC`} render={({ field }) => (
                                    <button 
                                        type="button" 
                                        onClick={() => field.onChange(!field.value)}
                                        className={cn(
                                            "text-[9px] font-bold px-1.5 py-0.5 rounded transition-all transform active:scale-95 uppercase border",
                                            field.value 
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                                                : "bg-slate-50 border-slate-200 text-slate-400"
                                        )}
                                    >
                                        {field.value ? 'TTC' : 'HT'}
                                    </button>
                                )} />
                                <Label className="text-[10px] text-slate-400 uppercase">Achat</Label>
                                <FormField control={control} name={`items.${index}.prixAchat`} render={({ field }) => (
                                    <Input 
                                        type="number" step="0.01" {...field} 
                                        onFocus={(e) => e.target.select()}
                                        className="h-7 w-[80px] text-right font-mono text-xs border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-400" 
                                    />
                                )} />
                          </div>
                          {/* Selling */}
                           <div className="flex items-center justify-end gap-1">
                                <Label className="text-[10px] text-slate-400 uppercase">Vente</Label>
                                <FormField control={control} name={`items.${index}.prixVente`} render={({ field }) => (
                                    <div className="relative flex items-center">
                                        <Input 
                                            type="number" step="0.01" {...field} 
                                            onFocus={(e) => e.target.select()}
                                            className={cn(
                                                "h-7 w-[80px] text-right font-mono text-xs font-bold border-slate-100 bg-white focus:border-indigo-400 shadow-sm pr-6",
                                                isLowMargin && "text-red-600"
                                            )} 
                                        />
                                        {valPrixAchat > 0 && valPrixVente === 0 && (
                                            <button 
                                                type="button"
                                                onClick={() => field.onChange(Math.round(valPrixAchat * 1.4 * 10) / 10)}
                                                className="absolute right-1 text-indigo-400 hover:text-indigo-600 transition-colors"
                                                title="Suggérer +40%"
                                            >
                                                <Sparkles className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                )} />
                          </div>
                     </div>

                     <div className="w-px h-16 bg-slate-100" />

                     <div className="flex-1 space-y-2">
                        {/* Margin Indicator */}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 uppercase">Marge</span>
                            <span className={cn(
                                "text-xs font-bold tabular-nums px-1.5 py-0.5 rounded",
                                isLowMargin ? "bg-red-100 text-red-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                                {isFinite(marginPercent) ? `${marginPercent.toFixed(0)}%` : '-'}
                            </span>
                        </div>

                        {/* Stock Input */}
                        <div className="flex items-center justify-end gap-2">
                            <Label className="text-[10px] text-slate-400 uppercase">Qté</Label>
                            <FormField control={control} name={`items.${index}.quantiteStock`} render={({ field }) => (
                                <div className="flex items-center">
                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-l border border-r-0 border-slate-200" onClick={() => field.onChange(Math.max(0, Number(field.value) - 1))}>-</Button>
                                    <Input 
                                        type="number" {...field} 
                                        onFocus={(e) => e.target.select()}
                                        className="h-5 w-10 text-center font-mono text-xs border-y border-x-0 border-slate-200 rounded-none bg-white p-0" 
                                    />
                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-r border border-l-0 border-slate-200" onClick={() => field.onChange(Number(field.value) + 1)}>+</Button>
                                </div>
                            )} />
                        </div>
                     </div>
                </div>
            </TableCell>

            {/* 5. Actions */}
            <TableCell className="text-center py-3">
                <div className="flex flex-col gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-indigo-600" onClick={() => duplicate(index)}>
                        <Copy className="h-3 w-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600" onClick={() => remove(index)}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}


