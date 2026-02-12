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
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Brand, Category, Material, Color, Supplier } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

    // Form
    const form = useForm<ScannerFormValues>({
        resolver: zodResolver(ScannerFormSchema),
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
                    
                    // Map AI data to Form
                    const supplier = suppliers.find(s => {
                        const dbName = s.name.toLowerCase();
                        const aiName = (invoiceData.supplierName || '').toLowerCase();
                        return dbName.includes(aiName) || aiName.includes(dbName);
                    });
                    
                    const defaultCat = categories.find(c => c.name === 'Import IA') || categories[0];
                    const defaultBrand = brands.find(b => b.name === 'Générique') || brands[0];

                    form.setValue('numFacture', invoiceData.invoiceNumber || '');
                    
                    // Try to parse the date safely
                    if (invoiceData.date) {
                        try {
                            const parsedDate = new Date(invoiceData.date);
                            if (!isNaN(parsedDate.getTime())) {
                                // Input type="date" expects YYYY-MM-DD string
                                const isoDate = parsedDate.toISOString().split('T')[0];
                                form.setValue('dateAchat', isoDate);
                            }
                        } catch (e) {
                            console.error("Date parsing error", e);
                        }
                    }

                    if (supplier) {
                        form.setValue('fournisseurId', supplier.id);
                    }

                    const newItems = invoiceData.products?.map((p: any) => {
                        // Intelligent matching for Brand and Category
                        const matchedBrand = brands.find(b => 
                            b.name.toLowerCase() === (p.brand || '').toLowerCase()
                        );
                        const matchedCat = categories.find(c => 
                            c.name.toLowerCase() === (p.category || '').toLowerCase()
                        );

                        return {
                            reference: p.reference || '', 
                            nomProduit: p.name,
                            categorieId: matchedCat?.id || '', // Leave empty if not sure, forcing user selection
                            marqueId: matchedBrand?.id || '',
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
                        };
                    }) || [];

                    replace(newItems);

                    toast({
                        title: "Analyse terminée ! ✅",
                        description: `${newItems.length} produits identifiés. Veuillez vérifier les détails.`,
                    });

                } catch (err: any) {
                    toast({ variant: "destructive", title: "Erreur", description: err.message });
                } finally {
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
             // Basic Validation
             const validItems = data.items.filter(it => it.nomProduit && it.categorieId);
             if (validItems.length !== data.items.length) {
                 toast({ variant: "destructive", title: "Données incomplètes", description: "Vérifiez que tous les produits ont un Nom et une Catégorie." });
                 setIsSaving(false);
                 return;
             }
             
             // Map to API format (names instead of IDs for creation if needed, but here we pass IDs mostly)
             // Check API requirements: createBulkProducts expects names for category/brand usually if logic is there, 
             // but here we used IDs in the form. Let's see if update logic handles it.
             // Actually ProductForm maps IDs back to Names before sending.
             
             const apiItems = validItems.map(item => ({
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
            if (index === 0) return;
            form.setValue(`items.${index}.${fieldName}` as any, firstVal);
        });
        toast({ title: "Appliqué", description: `Valeur copiée sur toutes les lignes.` });
    };

    const duplicateRow = (index: number) => {
        const item = form.getValues().items[index];
        insert(index + 1, { ...item, reference: '', nomProduit: item.nomProduit + ' (Copie)' });
    };

    const onAddRow = () => {
        append({
            reference: '', nomProduit: '', categorieId: '', marqueId: '', 
            matiereId: '', couleurId: '', prixAchat: 0, prixVente: 0, 
            quantiteStock: 1, stockMin: 0
        });
    };

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
                    className="relative overflow-hidden group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg transition-all duration-300 hover:shadow-violet-500/25 border-0 gap-2"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Sparkles className="h-4 w-4 animate-pulse text-violet-100" />
                    <span className="font-semibold tracking-wide">Scanner Facture IA</span>
                    <ScanEye className="h-4 w-4 opacity-70" />
                </Button>
            </DialogTrigger>
            <DialogContent 
                key={isOpen ? "open" : "closed"}
                className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-4 text-white shrink-0 flex justify-between items-center">
                    <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Sparkles className="h-5 w-5 text-violet-200" />
                            Scanner Facture (Gemini Vision)
                        </DialogTitle>
                        <DialogDescription className="text-violet-100/80 text-xs mt-1">
                            Analysez vos factures et ajoutez les produits au stock en un clic.
                        </DialogDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-12 h-full">
                    {/* Left: Preview */}
                    <div className="col-span-3 bg-slate-50 border-r border-slate-200 flex flex-col p-4 overflow-y-auto h-full min-h-0">
                         <div className="mb-4">
                             <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Document Source</Label>
                             <div 
                                className={cn(
                                    "relative group cursor-pointer aspect-[3/4] rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-white shadow-sm hover:border-violet-400 hover:bg-violet-50/30 overflow-hidden",
                                    previewUrl ? "border-violet-200" : "border-slate-300"
                                )}
                                onClick={(e) => {
                                    if (e.target !== fileInputRef.current) {
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                            fileInputRef.current.click();
                                        }
                                    }
                                }}
                            >
                                {previewUrl ? (
                                    <div className="w-full h-full relative" onClick={(e) => e.stopPropagation()}>
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setPreviewUrl(null); 
                                                replace([]);
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center p-4">
                                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium">Cliquez pour importer</p>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                            </div>
                         </div>

                         <Button 
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-md mb-4" 
                            onClick={handleScan}
                            disabled={isProcessing || !previewUrl}
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScanEye className="h-4 w-4 mr-2" />}
                            {isProcessing ? 'Analyse...' : 'Lancer l\'IA'}
                        </Button>

                        {/* Invoice Header Form */}
                        <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Info Facture
                            </h4>
                            <div className="space-y-2">
                                <Form {...form}>
                                    <FormField control={form.control} name="fournisseurId" render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-[10px] uppercase text-slate-400 font-bold">Fournisseur</Label>
                                            <SearchableSelect 
                                                options={suppliers.map(s => ({ label: s.name, value: s.id }))} 
                                                value={field.value} 
                                                onChange={field.onChange} 
                                                placeholder="Fournisseur..." 
                                                className="h-8 text-xs bg-slate-50 border-slate-200" 
                                            />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="numFacture" render={({ field }) => (
                                            <FormItem>
                                                <Label className="text-[10px] uppercase text-slate-400 font-bold">N° Facture</Label>
                                                <Input {...field} className="h-8 text-xs bg-slate-50 border-slate-200" placeholder="FAC-001" />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="dateAchat" render={({ field }) => (
                                            <FormItem>
                                                <Label className="text-[10px] uppercase text-slate-400 font-bold">Date</Label>
                                                <Input type="date" {...field} className="h-8 text-xs bg-slate-50 border-slate-200" />
                                            </FormItem>
                                        )} />
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </div>

                    {/* Right: Product Modification Zone */}
                    <div className="col-span-9 flex flex-col bg-white min-h-0 h-full overflow-hidden">
                        <TooltipProvider>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
                                {/* Toolbar */}
                                <div className="p-3 border-b flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-violet-100 text-violet-700 p-1.5 rounded-md">
                                            <PackagePlus className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">Zone de Modification</h3>
                                            <p className="text-xs text-slate-500">{fields.length} produits détectés</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 border-r pr-4 mr-2">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Catégorie Globale :</Label>
                                            <SearchableSelect 
                                                options={categories.map(c => ({ label: c.name, value: c.id }))} 
                                                placeholder="Appliquer à tous..." 
                                                className="h-8 w-[180px] text-xs"
                                                onChange={(val) => {
                                                    const currentItems = form.getValues().items;
                                                    currentItems.forEach((_, index) => {
                                                        form.setValue(`items.${index}.categorieId`, val);
                                                    });
                                                    toast({ title: "Appliqué", description: "Catégorie mise à jour pour tous les produits." });
                                                }}
                                            />
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => onAddRow()} className="h-8 text-xs gap-1.5">
                                            <PlusCircle className="h-3.5 w-3.5" /> Ajouter
                                        </Button>
                                    </div>
                                </div>

                                {/* Table Scroll Area */}
                                <ScrollArea className="flex-1 bg-slate-50/30 relative">
                                    {fields.length === 0 ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                            <Scan className="h-12 w-12 opacity-20 mb-3" />
                                            <p className="text-sm font-medium">Importez une facture pour commencer</p>
                                        </div>
                                    ) : (
                                        <div className="min-w-[1100px]">
                                            <Table className="border-separate border-spacing-0">
                                                <TableHeader className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md border-b-2 border-slate-200">
                                                    <TableRow className="grid grid-cols-[50px_1fr_200px_300px_80px] items-center gap-4 hover:bg-transparent border-none">
                                                        <TableHead className="py-4 font-semibold text-xs text-slate-500 text-center">#</TableHead>
                                                        <TableHead className="py-4 font-semibold text-xs text-slate-500">
                                                            <div className="flex items-center gap-2">
                                                                Produit (Réf / Nom / Marque / Cat)
                                                                <ArrowDownToLine className="h-3.5 w-3.5 cursor-pointer text-slate-300 hover:text-primary transition-colors" onClick={() => { applyToAll('marqueId'); applyToAll('categorieId'); }} />
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="py-4 font-semibold text-xs text-slate-500">Détails</TableHead>
                                                        <TableHead className="py-4 font-semibold text-xs text-slate-500 text-right pr-4">Finance & Stock</TableHead>
                                                        <TableHead className="py-4 font-semibold text-xs text-slate-500 text-center"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="divide-y divide-slate-100 table-row-group">
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
                                                        />
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                    <ScrollBar orientation="horizontal" className="z-50" />
                                    <ScrollBar orientation="vertical" className="z-50" />
                                </ScrollArea>

                                {/* Footer */}
                                <div className="p-4 border-t bg-white flex items-center justify-between shrink-0 z-30 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>Vérifiez les données avant confirmation.</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Annuler</Button>
                                        <Button 
                                            type="submit" 
                                            className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6"
                                            disabled={isSaving || fields.length === 0}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            Confirmer l'Ajout
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
    index, control, remove, duplicate, brands, categories, materials, colors, handleQuickCreate, isCreatingSetting, setBrands, setCategories, setMaterials, setColors
}: any) {
    const prixAchat = useWatch({ control, name: `items.${index}.prixAchat` });
    const prixVente = useWatch({ control, name: `items.${index}.prixVente` });
    const isAchatTTC = useWatch({ control, name: `items.${index}.isAchatTTC` });
    const nomProduit = useWatch({ control, name: `items.${index}.nomProduit` });
    const categorieId = useWatch({ control, name: `items.${index}.categorieId` });
    const marqueId = useWatch({ control, name: `items.${index}.marqueId` });

    const valPrixAchat = Number(prixAchat) || 0;
    const valPrixVente = Number(prixVente) || 0;
    const cost = isAchatTTC ? (valPrixAchat / 1.2) : valPrixAchat;
    const margin = valPrixVente - cost;
    const marginPercent = valPrixVente > 0 ? (margin / valPrixVente) * 100 : 0;
    const isLowMargin = marginPercent < 20 && valPrixVente > 0;
    
    const isIncomplete = !nomProduit || !marqueId || !categorieId;

    const rowLayout = "grid grid-cols-[50px_1fr_200px_300px_80px] items-start gap-4";

    return (
        <TableRow className={cn(
            rowLayout,
            "group border-b border-slate-100 transition-colors",
            index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
            isIncomplete && "bg-red-50/10 hover:bg-red-50/20",
            !isIncomplete && "hover:bg-blue-50/20"
        )}>
            {/* Index */}
            <TableCell className="text-center text-xs font-medium text-slate-400 py-4 h-full border-r border-slate-50">
                {String(index + 1).padStart(2, '0')}
            </TableCell>
            
            {/* Identity & Technical */}
            <TableCell className="py-3 px-1 h-full border-r border-slate-50">
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                        <FormField control={control} name={`items.${index}.nomProduit`} render={({ field }) => (
                            <FormControl><Input placeholder="Désignation..." {...field} className={cn("h-10 text-sm font-medium border-slate-200 bg-white focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm w-full", !nomProduit && "border-red-200 bg-red-50/30")} /></FormControl>
                        )} />
                        <FormField control={control} name={`items.${index}.reference`} render={({ field }) => (
                            <FormControl><Input placeholder="RÉF" {...field} className="h-10 w-[120px] text-xs font-mono border-slate-200 bg-white focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm uppercase shrink-0" /></FormControl>
                        )} />
                    </div>
                    <div className="flex items-center gap-2">
                        <FormField control={control} name={`items.${index}.marqueId`} render={({ field }) => (
                            <div className="flex-1">
                                <SearchableSelect options={brands.map((b: any) => ({ label: b.name, value: b.id }))} value={field.value} onChange={field.onChange} placeholder="Marque..." className="h-10 text-xs font-medium border-slate-200 bg-white shadow-sm w-full" onCreateNew={(name) => handleQuickCreate('brands', name, setBrands, `items.${index}.marqueId`)} isCreating={isCreatingSetting} />
                            </div>
                        )} />
                        <FormField control={control} name={`items.${index}.categorieId`} render={({ field }) => (
                           <div className="flex-1">
                                <SearchableSelect options={categories.map((c: any) => ({ label: c.name, value: c.id }))} value={field.value} onChange={field.onChange} placeholder="Catégorie..." className={cn("h-10 text-xs font-medium border-slate-200 bg-white shadow-sm w-full", !categorieId && "border-red-200 text-red-500")} onCreateNew={(name) => handleQuickCreate('categories', name, setCategories, `items.${index}.categorieId`)} isCreating={isCreatingSetting} />
                           </div>
                        )} />
                    </div>
                </div>
            </TableCell>

             {/* Technical */}
            <TableCell className="py-3 px-1 h-full border-r border-slate-50">
                 <div className="flex flex-col gap-2.5 h-full">
                     <FormField control={control} name={`items.${index}.matiereId`} render={({ field }) => (
                        <SearchableSelect options={materials.map((m: any) => ({ label: m.name, value: m.id }))} value={field.value} onChange={field.onChange} placeholder="Matière..." className="h-10 text-xs border-slate-200 bg-slate-50/50 hover:bg-white shadow-none focus:bg-white transition-all w-full" onCreateNew={(name) => handleQuickCreate('materials', name, setMaterials, `items.${index}.matiereId`)} isCreating={isCreatingSetting} />
                    )} />
                    <FormField control={control} name={`items.${index}.couleurId`} render={({ field }) => (
                        <SearchableSelect options={colors.map((c: any) => ({ label: c.name, value: c.id }))} value={field.value} onChange={field.onChange} placeholder="Couleur..." className="h-10 text-xs border-slate-200 bg-slate-50/50 hover:bg-white shadow-none focus:bg-white transition-all w-full" onCreateNew={(name) => handleQuickCreate('colors', name, setColors, `items.${index}.couleurId`)} isCreating={isCreatingSetting} />
                    )} />
                </div>
            </TableCell>

            {/* Financials */}
            <TableCell className="py-3 px-1 h-full border-r border-slate-50">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <FormField control={control} name={`items.${index}.prixAchat`} render={({ field }) => (
                            <div className="relative group/price flex flex-col">
                                <div className="relative flex items-center">
                                    <span className="absolute left-2 top-[3px] text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10 pointer-events-none">Achat</span>
                                    <Input type="number" step="0.01" {...field} className="h-11 pt-4 text-right pr-9 font-mono text-sm font-bold border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary/10 w-full" />
                                    <FormField control={control} name={`items.${index}.isAchatTTC`} render={({ field }) => (
                                        <div 
                                            onClick={() => field.onChange(!field.value)} 
                                            className={cn(
                                                "absolute right-1 top-[6px] h-8 w-6 rounded flex items-center justify-center cursor-pointer transition-all border text-[10px] font-bold z-20",
                                                field.value ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                                            )}
                                        >
                                            {field.value ? "T" : "H"}
                                        </div>
                                    )} />
                                </div>
                                <div className="mt-1 flex justify-end px-1">
                                    <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                                        Eq. {isAchatTTC ? (valPrixAchat / 1.2).toFixed(2) : (valPrixAchat * 1.2).toFixed(2)} {isAchatTTC ? 'HT' : 'TTC'}
                                    </span>
                                </div>
                            </div>
                        )} />
                         <FormField control={control} name={`items.${index}.prixVente`} render={({ field }) => (
                            <div className="relative">
                                <span className="absolute left-2 top-[3px] text-[10px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">Vente</span>
                                <Input type="number" step="0.01" {...field} className={cn("h-11 pt-4 text-right font-mono font-bold text-sm border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500/20", isLowMargin ? "text-red-500" : "text-emerald-600")} />
                            </div>
                        )} />
                    </div>
                    
                    <div className="grid grid-cols-[1fr_1fr_60px] items-center gap-1 p-1 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 pl-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Qté</span>
                            <FormField control={control} name={`items.${index}.quantiteStock`} render={({ field }) => (
                                <Input type="number" {...field} className="h-8 w-full text-center font-mono text-xs font-bold border-transparent bg-white shadow-sm p-0 rounded focus:ring-0" />
                            )} />
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Min</span>
                            <FormField control={control} name={`items.${index}.stockMin`} render={({ field }) => (
                                <Input type="number" {...field} className="h-8 w-full text-center font-mono text-xs font-bold border-transparent bg-white shadow-sm p-0 rounded focus:ring-0" />
                            )} />
                        </div>
                        <div className="flex justify-center border-l border-slate-200">
                            <span className={cn("text-xs font-bold tabular-nums", valPrixVente === 0 ? "text-slate-200" : isLowMargin ? "text-red-500" : "text-emerald-600")}>
                                {isFinite(marginPercent) ? `${marginPercent.toFixed(0)}%` : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* Actions */}
            <TableCell className="text-center py-4 h-full">
                <div className="flex flex-col items-center justify-center gap-1 h-full">
                    <Tooltip><TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-full" onClick={() => duplicate(index)}><Copy className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger><TooltipContent className="text-[10px]">Copier</TooltipContent></Tooltip>
                    
                    <Tooltip><TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all rounded-full" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger><TooltipContent className="text-[10px]">Supprimer</TooltipContent></Tooltip>
                </div>
            </TableCell>
        </TableRow>
    );
}


