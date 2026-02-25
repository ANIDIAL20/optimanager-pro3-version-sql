// @ts-nocheck
'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch, Control, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Trash2, Plus, Copy, ArrowDownToLine, ArrowLeft, Package, Truck, FileText, AlertCircle, Info, Keyboard, Calendar, Receipt, PlusCircle, ChevronUp, ChevronDown } from 'lucide-react';
import type { Brand, Material, Category, Color, Product, Supplier } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { createBulkProducts, updateProduct } from '@/app/actions/products-actions';
import { getBrands, getCategories, getMaterials, getColors, createSetting } from '@/app/actions/settings-actions';
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CreditCard, Wallet, Percent, ShieldCheck } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BreadcrumbCustom } from "@/components/ui/breadcrumb-custom";
import { calculateFromHT, calculateFromTTC, calculatePrices, formatPrice, isCategoryVatExempt } from '@/lib/tva-helpers';
import { useFormContext } from 'react-hook-form';

const GRID_LAYOUT = "grid grid-cols-[50px_1fr_200px_300px_80px] items-center gap-4";

const COLUMNS = [
    { id: 'index', label: '#', align: 'center' },
    { id: 'identity', label: 'Produit', align: 'left' },
    { id: 'specs', label: 'Détails', align: 'left' },
    { id: 'financials', label: 'Offre & Stock', align: 'right' },
    { id: 'actions', label: '', align: 'center' },
] as const;

// --- Improved Schema ---

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
  stockMin: z.coerce.number().optional().default(5),
  description: z.string().optional(),
  details: z.string().optional(),
  imageUrl: z.string().optional(),
  // ✅ New VAT Fields
  hasTva: z.boolean().default(true).optional(),
  priceType: z.enum(['HT', 'TTC']).default('TTC').optional(),
});

const BulkProductSchema = z.object({
    fournisseurId: z.string().optional(),
    numFacture: z.string().optional(),
    dateAchat: z.string().optional(),
    items: z.array(ProductItemSchema).min(1, "Il faut au moins un produit.")
});

type BulkProductFormValues = z.infer<typeof BulkProductSchema>;

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditMode] = React.useState(!!product);
  
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [colors, setColors] = React.useState<Color[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  
  const [isCreatingSetting, setIsCreatingSetting] = React.useState(false);

  const form = useForm<BulkProductFormValues>({
    resolver: zodResolver(BulkProductSchema),
    defaultValues: {
          fournisseurId: '',
          numFacture: '',
          dateAchat: new Date().toISOString().split('T')[0],
          items: [{ 
              reference: '', nomProduit: '', categorieId: '', marqueId: '', 
              matiereId: '', couleurId: '',
              prixAchat: 0, prixVente: 0, quantiteStock: 1, stockMin: 5,
              imageUrl: '', description: '', details: '', isAchatTTC: false
          }]
      },
  });

  const { fields, append, remove, insert } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  });

  const totals = React.useMemo(() => {
    return watchedItems.reduce((acc, item) => {
      const gQty = Number(item.quantiteStock) || 0;
      const gPriceAchatInput = Number(item.prixAchat) || 0;
      const gIsTTC = !!item.isAchatTTC;
      
      // Calculate costs using robust helper
      // If item.isAchatTTC is true, input is TTC. If false, input is HT.
      // We assume purchase always has VAT unless specifically marked otherwise, 
      // but current schema doesn't seem to have a specific 'purchaseHasTva' field separate from 'hasTva' (which is for sales).
      // However, typically B2B purchases have VAT unless supplier is exempt.
      // For now, we apply standard logic: 
      // - If input is TTC, HT = Input / 1.2
      // - If input is HT, TTC = Input * 1.2
      // - Standard VAT rate applies
      
      const breakdown = calculatePrices({
        amount: gPriceAchatInput,
        type: gIsTTC ? 'TTC' : 'HT',
        hasTva: item.hasTva !== false
      });

      acc.count += 1;
      acc.units += gQty;
      acc.totalCostHT += breakdown.ht * gQty;
      acc.totalCostTTC += breakdown.ttc * gQty;
      return acc;
    }, { count: 0, units: 0, totalCostHT: 0, totalCostTTC: 0 });
  }, [watchedItems]);

  const selectedSupplier = React.useMemo(() => {
    const sId = form.watch('fournisseurId');
    return suppliers.find(s => s.id === sId);
  }, [form.watch('fournisseurId'), suppliers]);

  // SMART HT/TTC Logic: Update items based on supplier default
  React.useEffect(() => {
      if (selectedSupplier?.defaultTaxMode && !isEditMode) {
          const mode = selectedSupplier.defaultTaxMode === 'TTC';
          const currentItems = form.getValues().items;
          const hasMixedModes = currentItems.some(it => it.isAchatTTC !== mode);
          
          if (hasMixedModes) {
              currentItems.forEach((_, idx) => {
                  form.setValue(`items.${idx}.isAchatTTC`, mode);
              });
              toast({ 
                  title: `Mode ${selectedSupplier.defaultTaxMode} appliqué`, 
                  description: `Le fournisseur ${selectedSupplier.name} préfère la saisie en ${selectedSupplier.defaultTaxMode}.`,
                  duration: 3000
              });
          }
      }
  }, [selectedSupplier?.id, isEditMode, form, toast]);

  const invalidLinesCount = React.useMemo(() => {
    return watchedItems.filter(it => !it.nomProduit || !it.categorieId).length;
  }, [watchedItems]);

  const hasMixedTaxes = React.useMemo(() => {
    // Only check items that actually have VAT
    const relevantItems = watchedItems.filter(it => it.hasTva !== false);
    return relevantItems.some(it => it.isAchatTTC) && relevantItems.some(it => !it.isAchatTTC);
  }, [watchedItems]);

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const [bResult, cResult, mResult, colResult, suppResult] = await Promise.all([
          getBrands(),
          getCategories(),
          getMaterials(),
          getColors(),
          getSuppliersList()
        ]);

        const b = (bResult.success && bResult.data ? bResult.data : []).map((x: any) => ({ ...x, id: x.id.toString() }));
        const c = (cResult.success && cResult.data ? cResult.data : []).map((x: any) => ({ ...x, id: x.id.toString() }));
        const m = (mResult.success && mResult.data ? mResult.data : []).map((x: any) => ({ ...x, id: x.id.toString() }));
        const col = (colResult.success && colResult.data ? colResult.data : []).map((x: any) => ({ ...x, id: x.id.toString() }));
        const supp = (suppResult.success && suppResult.data ? suppResult.data : []).map((x: any) => ({ ...x, id: x.id.toString() }));

        setBrands(b);
        setCategories(c);
        setMaterials(m);
        setColors(col);
        setSuppliers(supp);

        if (product) {
            const catId = c.find((cat: any) => cat.name === product.categorie || cat.name === (product as any).category)?.id || product.categorieId || '';
            const brandId = b.find((br: any) => br.name === product.marque)?.id || product.marqueId || '';
            const matId = m.find((mx: any) => mx.id === product.matiereId?.toString())?.id || '';
            const colId = col.find((cx: any) => cx.id === product.couleurId?.toString())?.id || '';
            const suppId = (product as any).fournisseurId || supp.find((s: any) => s.name === (product as any).fournisseur)?.id || '';

            form.reset({
                fournisseurId: suppId,
                numFacture: '',
                dateAchat: new Date().toISOString().split('T')[0],
                items: [{
                    reference: product.reference || '',
                    nomProduit: product.nomProduit || (product as any).name || '',
                    categorieId: catId,
                    marqueId: brandId,
                    matiereId: matId,
                    couleurId: colId,
                    prixAchat: Number(product.prixAchat || 0),
                    prixVente: Number(product.prixVente || 0),
                    quantiteStock: Number(product.quantiteStock || 0),
                    stockMin: Number(product.stockMin || 5),
                    description: product.description || '',
                    imageUrl: product.imageUrl || '',
                    isAchatTTC: false
                }]
            });
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    }
    loadSettings();
  }, [product, form]);

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

  const onSubmit = async (data: BulkProductFormValues) => {
    setIsSubmitting(true);
    try {
        if (isEditMode && product) {
            const item = data.items[0];
            const payload = {
                ...item,
                stockMin: item.stockMin,
                matiereId: item.matiereId || undefined,
                couleurId: item.couleurId || undefined,
                categorie: categories.find(c => c.id === item.categorieId)?.name,
                marque: brands.find(b => b.id === item.marqueId)?.name,
                fournisseur: suppliers.find(s => s.id === data.fournisseurId)?.name,
                // ✅ TVA Fields
                hasTva: item.hasTva,
                priceType: item.priceType 
            };
            const res = await updateProduct(product.id, payload);
            if (res.success) {
                 toast({ title: 'Produit modifié', description: 'Mise à jour réussie' });
                 router.push(`/produits/${product.id}`); 
                 router.refresh();
            } else {
                 throw new Error(res.error);
            }
        } else {
             const filteredItems = data.items.filter(it => it.nomProduit.trim() !== '');
             const items = filteredItems.map(item => ({
                 ...item,
                 reference: item.reference || '',
                 matiereId: item.matiereId || undefined,
                 couleurId: item.couleurId || undefined,
                 categorie: categories.find(c => c.id === item.categorieId)?.name,
                 marque: brands.find(b => b.id === item.marqueId)?.name,
                 fournisseur: suppliers.find(s => s.id === data.fournisseurId)?.name,
                 // ✅ TVA Fields
                 hasTva: item.hasTva,
                 priceType: item.priceType
             }));
             const res = await createBulkProducts({ 
                 items, 
                 invoiceData: { 
                     fournisseurId: data.fournisseurId, 
                     numFacture: data.numFacture, 
                     dateAchat: data.dateAchat ? new Date(data.dateAchat) : undefined 
                 } 
             });
             if (res.success) {
                 toast({ title: 'Succès', description: res.message });
                 router.push('/produits');
             } else {
                 throw new Error(res.error);
             }
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onAddRow = (count: number = 1) => {
    const currentItems = form.getValues().items;
    const lastItem = currentItems[currentItems.length - 1];
    
    for (let i = 0; i < count; i++) {
        append({
          reference: '', nomProduit: '', 
          categorieId: lastItem?.categorieId || '', 
          marqueId: lastItem?.marqueId || '', 
          matiereId: lastItem?.matiereId || '', 
          couleurId: lastItem?.couleurId || '',
          prixAchat: 0, prixVente: 0, quantiteStock: 1, stockMin: 5,
          imageUrl: '', description: '', details: '', isAchatTTC: lastItem?.isAchatTTC || false,
          hasTva: true, priceType: 'TTC'
        });
    }
    
    if (count > 1) {
        toast({ title: "Lignes ajoutées", description: `${count} nouvelles lignes ont été créées.` });
    }
  };

  const duplicateRow = (index: number) => {
      const currentItems = form.getValues().items;
      const itemToCopy = currentItems[index];
      if (!itemToCopy) return;
      // Copy the name as well to save time, but clear reference as it should be unique
      const newItem = { ...itemToCopy, reference: '', nomProduit: itemToCopy.nomProduit };
      insert(index + 1, newItem);
      toast({ description: "Ligne dupliquée 👇", duration: 1500 });
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

  const isGlobalTTC = watchedItems[0]?.isAchatTTC || false;
  const toggleGlobalTaxMode = (isTTC: boolean) => {
    watchedItems.forEach((_, idx) => {
      form.setValue(`items.${idx}.isAchatTTC`, isTTC);
    });
    toast({ 
        title: `Mode Global: ${isTTC ? 'TTC' : 'HT'}`, 
        description: `Toutes les lignes ont été basculées en ${isTTC ? 'TTC' : 'HT'}.` 
    });
  };


  return (
    <TooltipProvider>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-[1600px] mx-auto px-6 pb-12">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                    <Link href="/produits">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                </Button>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                <Package className="h-6 w-6" />
                            </div>
                            {isEditMode ? "Modifier le Produit" : "Nouvelle Entrée"}
                        </h1>
                        {!isEditMode && (
                            <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 font-bold px-2.5 py-0.5 rounded-full">
                                Étape 1/2
                            </Badge>
                        )}
                    </div>
                    <p className="text-slate-500 ml-1">
                        {isEditMode 
                            ? `ID Produit: ${product?.id} — Réf: ${product?.reference}` 
                            : "Configurez les produits et les détails de la facture fournisseur"}
                    </p>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            {!isEditMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    <div className="lg:col-span-12 xl:col-span-8">
                        <div className="bg-card rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
                            <InvoiceInfoPanel 
                                form={form} 
                                suppliers={suppliers} 
                                onAddRow={onAddRow} 
                                isGlobalTTC={isGlobalTTC}
                                toggleGlobalTaxMode={toggleGlobalTaxMode}
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-12 xl:col-span-4">
                        <div className="h-full flex flex-col gap-4">
                            {/* Financial Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <SpotlightCard className="p-4" spotlightColor="rgba(59, 130, 246, 0.1)">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total HT</span>
                                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <CreditCard className="h-4 w-4 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-slate-900 tracking-tight">
                                            {totals.totalCostHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500">DH Hors Taxe</span>
                                    </div>
                                </SpotlightCard>

                                <SpotlightCard className="p-4" spotlightColor="rgba(16, 185, 129, 0.1)">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold uppercase text-emerald-700 tracking-wider">Total TTC</span>
                                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <Wallet className="h-4 w-4 text-emerald-600" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-emerald-600 tracking-tight">
                                            {totals.totalCostTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-xs font-medium text-emerald-600/80">DH TTC</span>
                                    </div>
                                </SpotlightCard>
                            </div>

                            {/* Stats & Actions */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-500 uppercase">Articles</span>
                                            <span className="text-2xl font-bold text-slate-900">{totals.units}</span>
                                        </div>
                                        <div className="h-8 w-px bg-slate-100" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-500 uppercase">Lignes</span>
                                            <span className="text-2xl font-bold text-slate-900">{totals.count}</span>
                                        </div>
                                    </div>
                                    {invalidLinesCount > 0 && (
                                        <div className="px-2 py-1 rounded-md bg-red-50 border border-red-100 flex items-center gap-1.5">
                                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                            <span className="text-[10px] font-bold text-red-600">{invalidLinesCount} err.</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex bg-white gap-3 mt-6">
                                    <SubmitButton 
                                        isLoading={isSubmitting} 
                                        disabled={invalidLinesCount > 0}
                                        className="flex-1 shadow-md hover:shadow-lg transition-all h-10 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                                    >
                                        <span className="flex items-center gap-2 justify-center font-semibold">
                                            <Truck className="h-4 w-4" />
                                            {`Valider (${totals.count})`}
                                        </span>
                                    </SubmitButton>
                                    <Button type="button" variant="ghost" className="h-10 px-4 text-slate-500 hover:text-slate-800 font-medium" onClick={() => router.back()}>
                                        Abandonner
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                       <div className="flex items-center gap-4">
                            <div className="bg-blue-50 p-2 rounded-lg"><Package className="h-5 w-5 text-blue-600" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Produit en cours d'édition</p>
                                <p className="text-sm font-black text-slate-800">{product?.nomProduit}</p>
                            </div>
                       </div>
                       <div className="flex items-center gap-3">
                            <Button type="button" variant="ghost" className="h-10 px-6 text-slate-400 font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all" onClick={() => router.back()}>
                                Annuler
                            </Button>
                            <SubmitButton 
                                isLoading={isSubmitting} 
                                disabled={invalidLinesCount > 0}
                                className="h-10 px-8 shadow-md hover:shadow-lg transition-all font-black uppercase tracking-widest text-[11px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                            >
                                Enregistrer les modifications
                            </SubmitButton>
                       </div>
                    </div>

                    {/* Invoice Info Panel (Collapsed by default in Edit Mode) */}
                    <div className="bg-card rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <InvoiceInfoPanel 
                            form={form} 
                            suppliers={suppliers} 
                            onAddRow={onAddRow} 
                            isGlobalTTC={isGlobalTTC}
                            toggleGlobalTaxMode={toggleGlobalTaxMode}
                            defaultOpen={false}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between px-6 py-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                    <Info className="h-4 w-4 fill-blue-200" />
                    <span>Saisie assistée : {selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.defaultTaxMode || 'HT'})` : "Sélectionnez un fournisseur."}</span>
                </div>
                {hasMixedTaxes && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 animate-pulse">
                        <AlertCircle className="h-4 w-4" />
                        <span>Attention : Mélange HT/TTC</span>
                    </div>
                )}
            </div>

            <div className="w-full border rounded-xl shadow-sm bg-card overflow-x-auto relative border-slate-200">
                <Table className="min-w-[1100px] border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md border-b-2 border-slate-200">
                        <TableRow className={cn("hover:bg-transparent border-none", GRID_LAYOUT)}>
                            {COLUMNS.map((col) => (
                                <TableHead 
                                    key={col.id} 
                                    className="py-4 font-semibold text-xs text-slate-500 border-b border-slate-200"
                                    style={{ textAlign: col.align as any }}
                                >
                                    <div className={cn(
                                        "flex items-center gap-2 mb-2",
                                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                                    )}>
                                        {col.label}
                                        {!isEditMode && col.id === 'identity' && (
                                            <div className="flex gap-1">
                                                <ArrowDownToLine 
                                                    className="h-3.5 w-3.5 cursor-pointer text-slate-300 hover:text-primary transition-colors" 
                                                    onClick={() => { applyToAll('marqueId'); applyToAll('categorieId'); }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 table-row-group">
                        {fields.map((field, index) => (
                            <ProductRow 
                                key={field.id} 
                                index={index} 
                                control={form.control} 
                                remove={remove} 
                                duplicate={duplicateRow}
                                brands={brands}
                                categories={categories}
                                materials={materials}
                                colors={colors}
                                isEditMode={isEditMode}
                                onAddRow={onAddRow}
                                handleQuickCreate={handleQuickCreate}
                                isCreatingSetting={isCreatingSetting}
                                setBrands={setBrands}
                                setCategories={setCategories}
                                setMaterials={setMaterials}
                                setColors={setColors}
                                isLast={index === fields.length - 1}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 flex justify-center">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onAddRow()}
                    className="group relative flex items-center gap-2 px-8 py-6 bg-white hover:bg-slate-50 border-dashed border-2 border-slate-200 hover:border-primary/50 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md group"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-5 transition duration-300"></div>
                    <div className="bg-slate-100 group-hover:bg-primary/10 p-2 rounded-xl transition-colors">
                        <Plus className="h-5 w-5 text-slate-500 group-hover:text-primary" />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">Ajouter une ligne</span>
                        <span className="block text-xs text-slate-400">Nouveau produit ou ligne vide</span>
                    </div>
                </Button>
            </div>
        </div>

      </form>
    </Form>
    </TooltipProvider>
  );
}

function InvoiceInfoPanel({ 
  form, suppliers, onAddRow, isGlobalTTC, toggleGlobalTaxMode, defaultOpen 
}: { 
  form: any, suppliers: Supplier[], onAddRow: (count?: number) => void, isGlobalTTC: boolean, toggleGlobalTaxMode: (isTTC: boolean) => void, defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen ?? true);
  const [linesToAdd, setLinesToAdd] = React.useState(1);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-0 overflow-hidden bg-white">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg"><Package className="h-5 w-5 text-primary" /></div>
            <div>
                <h3 className="text-sm font-bold text-slate-800">Entrée Stock</h3>
                <p className="text-xs text-slate-500">Information Facture</p>
            </div>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80 transition-transform duration-300">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
          <div className="p-6 bg-slate-50/50 grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* ROW 1: Supplier, Invoice, Date */}
            <div className="md:col-span-6">
                <FormField control={form.control} name="fournisseurId" render={({ field }) => (
                    <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-slate-600">
                        <Truck className="h-4 w-4" /> 
                        Fournisseur
                    </FormLabel>
                    <SearchableSelect 
                        options={suppliers.map(s => ({ label: s.name, value: s.id }))} 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Rechercher un fournisseur..." 
                        className="h-10 bg-white border-slate-200 shadow-sm transition-all focus:ring-2 focus:ring-primary/20" 
                    />
                    </FormItem>
                )} />
            </div>
            <div className="md:col-span-3">
                <FormField control={form.control} name="numFacture" render={({ field }) => (
                    <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-slate-600">
                        <FileText className="h-4 w-4" /> 
                        N° Facture
                    </FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input 
                                placeholder="FACT-..." 
                                {...field} 
                                className="h-10 pl-3 bg-white border-slate-200 font-mono text-xs shadow-sm focus:ring-2 focus:ring-primary/20" 
                            />
                        </div>
                    </FormControl>
                    </FormItem>
                )} />
            </div>
            <div className="md:col-span-3">
                <FormField control={form.control} name="dateAchat" render={({ field }) => (
                    <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" /> 
                        Date
                    </FormLabel>
                    <FormControl>
                        <Input 
                            type="date" 
                            {...field} 
                            className="h-10 bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-primary/20" 
                        />
                    </FormControl>
                    </FormItem>
                )} />
            </div>

            {/* ROW 2: Tax Mode, Spacer, Quantity & Add */}
            <div className="md:col-span-4">
                <div className="space-y-2">
                    <span className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Receipt className="h-4 w-4" />
                        Format Global
                    </span>
                    <div className="flex p-1 bg-slate-200/50 rounded-lg border border-slate-200/60">
                        <button 
                            type="button"
                            onClick={() => toggleGlobalTaxMode(false)}
                            className={cn(
                                "flex-1 py-2 rounded-md text-xs font-bold transition-all duration-200",
                                !isGlobalTTC 
                                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            HORS TAXE (HT)
                        </button>
                        <button 
                            type="button"
                            onClick={() => toggleGlobalTaxMode(true)}
                            className={cn(
                                "flex-1 py-1.5 rounded-md text-xs font-bold transition-all duration-200",
                                isGlobalTTC 
                                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            TTC
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="md:col-span-4 hidden md:block"></div>

            <div className="md:col-span-4">
                <div className="space-y-2">
                    <span className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <PlusCircle className="h-4 w-4" />
                        Ajout Rapide
                    </span>
                    <div className="flex gap-2">
                        <div className="w-20">
                            <Input 
                                type="number" 
                                min={1} 
                                max={50} 
                                value={linesToAdd} 
                                onChange={(e) => setLinesToAdd(parseInt(e.target.value) || 1)}
                                className="h-10 text-center font-black bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <Button 
                            type="button" 
                            variant="default" 
                            className="flex-1 h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all gap-2" 
                            onClick={() => onAddRow(linesToAdd)}
                        >
                            <Plus className="h-4 w-4" /> 
                            Ajouter Ligne(s)
                        </Button>
                    </div>
                </div>
            </div>
          </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ProductRowProps {
    index: number;
    control: Control<BulkProductFormValues>;
    remove: (index: number) => void;
    duplicate: (index: number) => void;
    brands: Brand[];
    categories: Category[];
    materials: Material[];
    colors: Color[];
    isEditMode: boolean;
    onAddRow: () => void;
    handleQuickCreate: any;
    isCreatingSetting: boolean;
    setBrands: any;
    setCategories: any;
    setMaterials: any;
    setColors: any;
    isLast: boolean;
}

function ProductRow({ 
    index, control, remove, duplicate, brands, categories, materials, colors, isEditMode, onAddRow, handleQuickCreate, isCreatingSetting, setBrands, setCategories, setMaterials, setColors, isLast
}: ProductRowProps) {
    const { setValue } = useFormContext();
    const prixAchat = useWatch({ control, name: `items.${index}.prixAchat` });
    const prixVente = useWatch({ control, name: `items.${index}.prixVente` });
    const isAchatTTC = useWatch({ control, name: `items.${index}.isAchatTTC` });
    const nomProduit = useWatch({ control, name: `items.${index}.nomProduit` });
    const categorieId = useWatch({ control, name: `items.${index}.categorieId` });
    const priceType = useWatch({ control, name: `items.${index}.priceType` });
    const hasTva = useWatch({ control, name: `items.${index}.hasTva` });

    // Auto-detect VAT exemption
    React.useEffect(() => {
        if (!categorieId) return;
        const category = categories.find(c => c.id === categorieId);
        if (category) {
            const isExempt = isCategoryVatExempt(category.name);
            // Only update if it differs from current to avoid loops, 
            // but we want to ENFORCE it when category changes.
            // Check if user manually changed it? 
            // For now, simple logic: if category implies exemption, apply it.
            // If category implies standard, apply it ONLY if current is not explicitly set?
            // Safer: Just apply the rule when category changes.
            const shouldHaveTva = !isExempt;
            if (hasTva !== shouldHaveTva) {
               setValue(`items.${index}.hasTva`, shouldHaveTva);
               // Also default priceType to HT if exempt (since HT=TTC)
               if (!shouldHaveTva) {
                   setValue(`items.${index}.isAchatTTC`, false);
                   setValue(`items.${index}.priceType`, 'HT');
               }
            }
        }
    }, [categorieId, categories, setValue, index, hasTva]);

    const valPrixAchat = Number(prixAchat) || 0;
    const valPrixVente = Number(prixVente) || 0;
    
    // ✅ MARGIN CALCULATION (COMMERCIAL MARGIN)
    // Formula: ((Vente TTC - Achat TTC) / Vente TTC) * 100
    // We use TTC values to represent the actual commercial value including tax impact if applicable
    
    const pricesAchat = calculatePrices({
        amount: valPrixAchat,
        type: isAchatTTC ? 'TTC' : 'HT',
        hasTva: hasTva !== false
    });

    const pricesVente = calculatePrices({
        amount: valPrixVente,
        type: priceType || 'TTC',
        hasTva: hasTva !== false
    });

    // Commercial Margin (Marge Commerciale) - Calculated on HT to be tax-neutral
    const marginValue = pricesVente.ht > 0 ? ((pricesVente.ht - pricesAchat.ht) / pricesVente.ht) * 100 : 0;
    
    // Thresholds: Standard retail often aims for > 30-40%. 
    // Low margin warning if below 20% (configurable)
    const isLowMargin = marginValue < 20 && pricesVente.ttc > 0;
    
    const isIncomplete = !nomProduit || !categorieId;

    const handleKeyDown = (e: React.KeyboardEvent) => { 
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); onAddRow(); }
        else if (e.key === 'd' && e.ctrlKey) { e.preventDefault(); duplicate(index); }
    };

    return (
        <TableRow className={cn(
            GRID_LAYOUT,
            "group border-b border-slate-100 transition-colors",
            index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
            isIncomplete && "bg-red-50/10 hover:bg-red-50/20",
            !isIncomplete && "hover:bg-blue-50/20"
        )}>
            {/* Index */}
            <TableCell className="text-center text-xs font-medium text-slate-400 py-4 h-full border-r border-slate-50">
                {String(index + 1).padStart(2, '0')}
            </TableCell>
            
            {/* Identity & Technical - Merged Column 1 */}
            <TableCell className="py-3 px-4 h-full border-r border-slate-50">
                <div className="flex flex-col gap-2.5">
                    {/* Nom & Reference Row */}
                    <div className="flex items-center gap-2">
                        <FormField control={control} name={`items.${index}.nomProduit`} render={({ field }) => (
                            <FormControl><Input placeholder="Désignation du produit (Modèle, Série...)" {...field} onKeyDown={handleKeyDown} className={cn("h-10 text-sm font-medium border-slate-200 bg-white focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm placeholder:text-slate-400 w-full", !nomProduit && "border-red-200 bg-red-50/30 placeholder:text-red-300")} /></FormControl>
                        )} />
                        <FormField control={control} name={`items.${index}.reference`} render={({ field }) => (
                            <FormControl><Input placeholder="RÉF" {...field} onKeyDown={handleKeyDown} className="h-10 w-[120px] text-xs font-mono border-slate-200 bg-white focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm uppercase placeholder:text-slate-400 shrink-0" /></FormControl>
                        )} />
                    </div>

                    {/* Marque & Category Row */}
                    <div className="flex items-center gap-2">
                        <FormField control={control} name={`items.${index}.marqueId`} render={({ field }) => (
                            <div className="flex-1">
                                <SearchableSelect options={brands.map(b => ({ label: b.name, value: b.id }))} value={field.value} onChange={field.onChange} placeholder="Marque..." className="h-10 text-xs font-medium border-slate-200 bg-white shadow-sm w-full" onCreateNew={(name) => handleQuickCreate('brands', name, setBrands, `items.${index}.marqueId`)} isCreating={isCreatingSetting} />
                            </div>
                        )} />
                        <FormField control={control} name={`items.${index}.categorieId`} render={({ field }) => (
                           <div className="flex-1">
                                <SearchableSelect options={categories.map(c => ({ label: c.name, value: c.id }))} value={field.value} onChange={field.onChange} placeholder="Catégorie..." className={cn("h-10 text-xs font-medium border-slate-200 bg-white shadow-sm w-full", !categorieId && "border-red-200 text-red-500")} onCreateNew={(name) => handleQuickCreate('categories', name, setCategories, `items.${index}.categorieId`)} isCreating={isCreatingSetting} />
                           </div>
                        )} />
                    </div>
                </div>
            </TableCell>

             {/* Technical - Column 2 */}
            <TableCell className="py-3 px-4 h-full border-r border-slate-50">
                 <div className="flex flex-col gap-2.5 h-full">
                     <FormField control={control} name={`items.${index}.matiereId`} render={({ field }) => (
                        <SearchableSelect options={materials.map(m => ({ label: m.name, value: m.id }))} value={field.value} onChange={field.onChange} placeholder="Matière (Acétate...)" className="h-10 text-xs border-slate-200 bg-slate-50/50 hover:bg-white shadow-none focus:bg-white transition-all w-full" onCreateNew={(name) => handleQuickCreate('materials', name, setMaterials, `items.${index}.matiereId`)} isCreating={isCreatingSetting} />
                    )} />
                    <FormField control={control} name={`items.${index}.couleurId`} render={({ field }) => (
                        <SearchableSelect options={colors.map(c => ({ label: c.name, value: c.id }))} value={field.value} onChange={field.onChange} placeholder="Couleur (Noir...)" className="h-10 text-xs border-slate-200 bg-slate-50/50 hover:bg-white shadow-none focus:bg-white transition-all w-full" onCreateNew={(name) => handleQuickCreate('colors', name, setColors, `items.${index}.couleurId`)} isCreating={isCreatingSetting} />
                    )} />
                </div>
            </TableCell>

            {/* Financials - Column 3 */}
            <TableCell className="py-3 px-4 h-full border-r border-slate-50">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative group/price flex flex-col">
                            <div className="relative flex items-center">
                                <span className="absolute left-2 top-[3px] text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10 pointer-events-none">Achat</span>
                                <FormField control={control} name={`items.${index}.prixAchat`} render={({ field }) => (
                                    <Input type="number" step="0.01" {...field} onKeyDown={handleKeyDown} className="no-spinner h-11 pt-4 text-right pr-9 pl-2 font-mono text-sm font-bold border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary/10 w-full" title="Prix d'achat unitaire" />
                                )} />
                                
                                <div className="absolute right-1 top-[6px] w-6 h-8 z-20">
                                    <FormField control={control} name={`items.${index}.isAchatTTC`} render={({ field: achatField }) => (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div 
                                                    onClick={() => hasTva !== false && achatField.onChange(!achatField.value)} 
                                                    className={cn(
                                                        "h-full w-full rounded flex items-center justify-center transition-all border text-[10px] font-black select-none",
                                                        hasTva === false 
                                                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                                                            : "cursor-pointer group-hover/price:border-slate-300",
                                                        hasTva !== false && achatField.value ? "bg-blue-50 border-blue-200 text-blue-600" : (hasTva !== false ? "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100" : "")
                                                    )}
                                                >
                                                    {hasTva === false ? <AlertCircle className="h-3 w-3" /> : (achatField.value ? "TTC" : "HT")}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-[10px]">
                                                {hasTva === false ? "Exonéré de TVA (Fixe)" : (achatField.value ? "Mode TTC : Taxe incluse" : "Mode HT : Taxe à ajouter")}
                                            </TooltipContent>
                                        </Tooltip>
                                    )} />
                                </div>
                            </div>
                                <div className="mt-1 flex justify-end px-1 h-4">
                                    {hasTva !== false ? (
                                        <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                                            Eq. {isAchatTTC 
                                                ? pricesAchat.ht.toFixed(2) 
                                                : pricesAchat.ttc.toFixed(2)} {isAchatTTC ? 'HT' : 'TTC'}
                                        </span>
                                    ) : (
                                         <span className="text-[9px] font-medium text-slate-300 italic">Hors Champ TVA</span>
                                    )}
                                </div>
                            </div>
                        <div className="relative group/sale flex flex-col">
                            <div className="relative flex items-center">
                                <span className="absolute left-2 top-[3px] text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider z-10 pointer-events-none">Vente</span>
                                <FormField control={control} name={`items.${index}.prixVente`} render={({ field }) => (
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        {...field} 
                                        onKeyDown={handleKeyDown} 
                                        className={cn(
                                            "no-spinner h-11 pt-4 text-right pr-9 pl-2 font-mono font-bold text-sm border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500/20 w-full", 
                                            isLowMargin ? "text-red-500" : "text-emerald-600"
                                        )} 
                                    />
                                )} />
                                
                                <div className="absolute right-1 top-[6px] w-6 h-8 z-20">
                                    <FormField control={control} name={`items.${index}.priceType`} render={({ field: typeField }) => (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div 
                                                    onClick={() => hasTva !== false && typeField.onChange(typeField.value === 'HT' ? 'TTC' : 'HT')}
                                                    className={cn(
                                                        "h-full w-full rounded flex items-center justify-center transition-all border text-[10px] font-black select-none",
                                                        hasTva === false 
                                                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                                                            : "cursor-pointer group-hover/sale:border-emerald-200",
                                                        hasTva !== false && typeField.value === 'HT' 
                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200" 
                                                            : (hasTva !== false ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" : "")
                                                    )}
                                                >
                                                    {hasTva === false ? <AlertCircle className="h-3 w-3" /> : (typeField.value === 'HT' ? "HT" : "TTC")}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-[10px]">
                                                {hasTva === false ? "Exonéré de TVA (Fixe)" : (typeField.value === 'HT' ? "Prix affiché Hors Taxes" : "Prix affiché Toutes Taxes Comprises")}
                                            </TooltipContent>
                                        </Tooltip>
                                    )} />
                                </div>
                            </div>
                                <div className="mt-1 flex justify-end px-1 h-4">
                                     {hasTva !== false ? (
                                        <span className={cn(
                                            "text-[10px] font-medium tabular-nums",
                                            isLowMargin ? "text-red-400" : "text-emerald-600/60"
                                        )}>
                                            Eq. {priceType === 'HT' ? pricesVente.ttc.toFixed(2) : pricesVente.ht.toFixed(2)} {priceType === 'HT' ? 'TTC' : 'HT'}
                                        </span>
                                     ) : (
                                         <span className="text-[9px] font-medium text-emerald-600/30 italic">Hors Champ TVA</span>
                                     )}
                                </div>
                            </div>
                    </div>
                    
                    <div className="grid grid-cols-[1fr_1fr_60px] items-center gap-1 p-1 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 pl-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Stock</span>
                            <FormField control={control} name={`items.${index}.quantiteStock`} render={({ field }) => (
                                <Input type="number" {...field} onKeyDown={handleKeyDown} className="no-spinner h-8 w-full text-center font-mono text-xs font-bold border-transparent bg-white shadow-sm p-0 rounded focus:ring-0" />
                            )} />
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Min</span>
                            <FormField control={control} name={`items.${index}.stockMin`} render={({ field }) => (
                                <Input type="number" {...field} onKeyDown={handleKeyDown} className="no-spinner h-8 w-full text-center font-mono text-xs font-bold border-transparent bg-white shadow-sm p-0 rounded focus:ring-0" />
                            )} />
                        </div>
                        <div className="flex justify-center border-l border-slate-200">
                            <span className={cn("text-xs font-bold tabular-nums", valPrixVente === 0 ? "text-slate-200" : isLowMargin ? "text-red-500" : "text-emerald-600")}>
                                {isFinite(marginValue) ? `${marginValue.toFixed(0)}%` : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* Actions */}
            <TableCell className="text-center py-4 h-full">
                <div className="flex flex-row items-center justify-center gap-1.5 h-full">
                    {!isEditMode ? (
                        <>
                         <Tooltip><TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-full" onClick={() => duplicate(index)}><Copy className="h-3.5 w-3.5" /></Button>
                         </TooltipTrigger><TooltipContent className="text-[10px]">Copier</TooltipContent></Tooltip>
                         
                         <Tooltip><TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-full" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                         </TooltipTrigger><TooltipContent className="text-[10px]">Supprimer</TooltipContent></Tooltip>
                        </>
                    ) : ( <div className="text-[8px] font-black text-slate-300 uppercase -rotate-90">Edit</div> )}
                </div>
            </TableCell>
        </TableRow>
    );
}
