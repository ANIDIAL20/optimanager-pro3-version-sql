'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch, Control, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Trash2, Plus, Copy, ArrowDownToLine, ArrowLeft } from 'lucide-react';
import type { Brand, Material, Category, Color, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createBulkProducts, updateProduct } from '@/app/actions/products-actions';
import { getBrands, getCategories, getMaterials, getColors, createSetting } from '@/app/actions/settings-actions';
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { SearchableSelect } from '@/components/ui/searchable-select';

// --- Improved Schema ---

const ProductItemSchema = z.object({
  reference: z.string().optional(), // Make optional in Zod but validate in UI or backend if needed unique
  nomProduit: z.string().min(1, 'Nom requis.'),
  categorieId: z.string().min(1, 'Catégorie requise.'),
  marqueId: z.string().min(1, 'Marque requise.'),
  matiereId: z.string().optional(),
  couleurId: z.string().optional(),
  prixAchat: z.coerce.number().optional(),
  isAchatTTC: z.boolean().default(false).optional(),
  prixVente: z.coerce.number().min(0, 'Prix requis.'),
  quantiteStock: z.coerce.number().min(0, 'Qte requise.'),
  stockMin: z.coerce.number().optional().default(5),
  description: z.string().optional(),
  details: z.string().optional(),
  imageUrl: z.string().optional(),
});

const BulkProductSchema = z.object({
    // Invoice Header (Optional in Edit Mode)
    fournisseurId: z.string().optional(),
    numFacture: z.string().optional(),
    dateAchat: z.string().optional(),
    
    // Items
    items: z.array(ProductItemSchema).min(1, "Il faut au moins un produit.")
});

type BulkProductFormValues = z.infer<typeof BulkProductSchema>;

interface ProductFormProps {
  product?: Product; // If provided, we are in EDIT mode
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditMode] = React.useState(!!product);
  
  // Settings State
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [colors, setColors] = React.useState<Color[]>([]);
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  
  const [isCreatingSetting, setIsCreatingSetting] = React.useState(false);

  // Initialize Form
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

  // Load Settings & Pre-fill for Edit Mode
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

        const b = bResult.map(x => ({ ...x, id: x.id.toString() } as any));
        const c = cResult.map(x => ({ ...x, id: x.id.toString() } as any));
        const m = mResult.map(x => ({ ...x, id: x.id.toString() } as any));
        const col = colResult.map(x => ({ ...x, id: x.id.toString() } as any));
        const supp = suppResult.map(x => ({ ...x, id: x.id.toString() }));

        setBrands(b);
        setCategories(c);
        setMaterials(m);
        setColors(col);
        setSuppliers(supp);

        if (product) {
            const catId = c.find(cat => cat.name === product.categorie || cat.name === product.category)?.id || product.categorieId || '';
            const brandId = b.find(br => br.name === product.marque || br.name === product.brand)?.id || product.marqueId || '';
            const matId = m.find(mx => mx.id === product.matiereId?.toString())?.id || '';
            const colId = col.find(cx => cx.id === product.couleurId?.toString())?.id || '';
            const suppId = supp.find(s => s.name === product.fournisseur)?.id || product.supplier || '';

            form.reset({
                fournisseurId: suppId,
                numFacture: '',
                dateAchat: new Date().toISOString().split('T')[0],
                items: [{
                    reference: product.reference || '',
                    nomProduit: product.nomProduit || product.name || '',
                    categorieId: catId,
                    marqueId: brandId,
                    matiereId: matId,
                    couleurId: colId,
                    prixAchat: Number(product.prixAchat || product.purchasePrice || 0),
                    prixVente: Number(product.prixVente || product.salePrice || 0),
                    quantiteStock: Number(product.quantiteStock || product.stock || 0),
                    stockMin: Number(product.stockMin || product.minStock || product.seuilAlerte || 5),
                    description: product.description || '',
                    imageUrl: product.imageUrl || '',
                    isAchatTTC: false
                }]
            });
        }

      } catch (err) {
        console.error("Error loading settings:", err);
        toast({ title: "Erreur", description: "Impossible de charger les paramètres.", variant: "destructive" });
      }
    }
    loadSettings();
  }, [product, form, toast]);

  // Quick Create Handler
  const handleQuickCreate = async (
    type: 'brands' | 'categories' | 'materials' | 'colors',
    name: string,
    setList: React.Dispatch<React.SetStateAction<any[]>>,
    fieldPath: any
  ) => {
    if (!name.trim()) return;
    setIsCreatingSetting(true);
    try {
      const created = await createSetting(type, { name: name.trim() });
      if (created) {
        const newItem = { ...created, id: created.id.toString() };
        setList((prev) => [...prev, newItem]);
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
                fournisseur: suppliers.find(s => s.id === data.fournisseurId)?.name 
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
            
             if (filteredItems.length === 0) {
                 toast({ title: 'Attention', description: 'Veuillez remplir au moins le nom du produit.', variant: 'destructive' });
                 return;
             }
 
             const items = filteredItems.map(item => ({
                 ...item,
                 reference: item.reference || '', // Let backend handle generation if empty? Backend says unique check.
                 matiereId: item.matiereId || undefined,
                 couleurId: item.couleurId || undefined,
                 categorie: categories.find(c => c.id === item.categorieId)?.name,
                 marque: brands.find(b => b.id === item.marqueId)?.name,
                 fournisseur: suppliers.find(s => s.id === data.fournisseurId)?.name
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

  const onAddRow = () => {
    append({
      reference: '', nomProduit: '', categorieId: '', marqueId: '', 
      matiereId: '', couleurId: '',
      prixAchat: 0, prixVente: 0, quantiteStock: 1, stockMin: 5,
      imageUrl: '', description: '', details: '', isAchatTTC: false
    });
  };

  const duplicateRow = (index: number) => {
      // Get current values from the form state to ensure we copy user input
      const currentItems = form.getValues().items;
      const itemToCopy = currentItems[index];

      if (!itemToCopy) return;

      const newItem = {
          ...itemToCopy,
          reference: '', // Clear unique fields
          nomProduit: '', // Clear name to force user attention
          // IDs are preserved
          categorieId: itemToCopy.categorieId,
          marqueId: itemToCopy.marqueId,
          matiereId: itemToCopy.matiereId,
          couleurId: itemToCopy.couleurId,
          prixAchat: itemToCopy.prixAchat,
          prixVente: itemToCopy.prixVente,
          isAchatTTC: itemToCopy.isAchatTTC,
          quantiteStock: itemToCopy.quantiteStock 
      };

      // Insert AFTER the current row
      insert(index + 1, newItem);
      
      toast({ description: "Ligne dupliquée 👇", duration: 1500 });
  };
  
  const applyToAll = (fieldName: any) => {
      const firstVal = form.getValues(`items.0.${fieldName}`);
      if (!firstVal) return;
      
      const currentItems = form.getValues().items;
      currentItems.forEach((item, index) => {
          if (index === 0) return;
          // Apply to empty lines as requested
          const currentVal = form.getValues(`items.${index}.${fieldName}`);
          if (!currentVal) {
              form.setValue(`items.${index}.${fieldName}`, firstVal);
          }
      });
      toast({ title: "Appliqué", description: "Valeur copiée sur les lignes vides." });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-[1800px] mx-auto">
        
        {/* Invoice Header - Only show in Bulk Mode */}
        {!isEditMode && (
             <Card className="mb-6">
                <CardHeader className="pb-4 py-4">
                    <CardTitle className="text-base font-medium flex justify-between items-center">
                        Informations Facture (Optionnel)
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
                    <FormField
                    control={form.control}
                    name="fournisseurId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Fournisseur</FormLabel>
                        <SearchableSelect
                            options={suppliers.map(s => ({ label: s.name, value: s.id }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Sélectionner..."
                            className="h-9"
                        />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="numFacture"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>N° Facture</FormLabel>
                        <FormControl><Input placeholder="FACT-XX" {...field} className="h-9" /></FormControl>
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="dateAchat"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date Achat</FormLabel>
                        <FormControl><Input type="date" {...field} className="h-9" /></FormControl>
                        </FormItem>
                    )}
                    />
                     <div className="flex items-end pb-1">
                        <Button type="button" variant="outline" size="sm" onClick={onAddRow} className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Ajouter Ligne
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}

        {/* Compact Table Grid */}
        <div className="border rounded-md shadow-sm bg-card max-h-[75vh] overflow-auto relative scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <Table>
                <TableHeader className="sticky top-0 z-20 bg-card shadow-sm">
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                        <TableHead className="w-[40px] text-center">#</TableHead>
                        <TableHead className="w-[180px]">Nom Produit</TableHead>
                        <TableHead className="w-[120px]">Réf</TableHead>
                        <TableHead className="min-w-[130px]">
                            <div className="flex items-center gap-1">
                                Marque
                                {!isEditMode && <ArrowDownToLine className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => applyToAll('marqueId')} title="Appliquer à tous" />}
                            </div>
                        </TableHead>
                        <TableHead className="min-w-[130px]">
                            <div className="flex items-center gap-1">
                                Catégorie
                                {!isEditMode && <ArrowDownToLine className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => applyToAll('categorieId')} title="Appliquer à tous" />}
                            </div>
                        </TableHead>
                        {/* New Columns */}
                        <TableHead className="min-w-[100px]">
                            <div className="flex items-center gap-1">
                                Matière
                                {!isEditMode && <ArrowDownToLine className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => applyToAll('matiereId')} title="Appliquer à tous" />}
                            </div>
                        </TableHead>
                         <TableHead className="min-w-[100px]">
                            <div className="flex items-center gap-1">
                                Couleur
                                {!isEditMode && <ArrowDownToLine className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => applyToAll('couleurId')} title="Appliquer à tous" />}
                            </div>
                        </TableHead>

                        <TableHead className="w-[100px] text-right">P. Achat</TableHead>
                        <TableHead className="w-[100px] text-right">P. Vente</TableHead>
                        <TableHead className="w-[60px] text-center">Marge</TableHead>
                        <TableHead className="w-[70px] text-center">Qte</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
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
                        />
                    ))}
                </TableBody>
            </Table>
            
            {fields.length === 0 && (
                 <div className="text-center py-8 text-muted-foreground">
                    Aucun produit. Cliquez sur "Ajouter une ligne".
                 </div>
            )}
        </div>

        <div className="flex justify-end gap-4 sticky bottom-4 z-10">
             {/* Backdrop blur applied to container to separate from content */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm -z-10 border-t" />
            
            <Button type="button" variant="ghost" onClick={() => router.back()}>
                Annuler
            </Button>
            <SubmitButton 
                isLoading={isSubmitting} 
                label={isEditMode ? "Enregistrer les modifications" : `Enregistrer ${fields.length} produit(s)`}
                loadingLabel="Enregistrement..."
                className="w-48 shadow-lg"
            />
        </div>

      </form>
    </Form>
  );
}

// Extracted Row Component for Performance & Hooks
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
}

function ProductRow({ 
    index, 
    control, 
    remove, 
    duplicate, 
    brands, 
    categories, 
    materials,
    colors,
    isEditMode,
    onAddRow,
    handleQuickCreate,
    isCreatingSetting,
    setBrands,
    setCategories,
    setMaterials,
    setColors
}: ProductRowProps) {
    const prixAchat = useWatch({ control, name: `items.${index}.prixAchat` });
    const prixVente = useWatch({ control, name: `items.${index}.prixVente` });
    const isAchatTTC = useWatch({ control, name: `items.${index}.isAchatTTC` });
    
    // Auto-Margin Calculation
    const valPrixAchat = Number(prixAchat) || 0;
    const valPrixVente = Number(prixVente) || 0;
    
    const cost = isAchatTTC ? (valPrixAchat / 1.2) : valPrixAchat;
    const margin = valPrixVente - cost;
    const marginPercent = valPrixVente > 0 ? (margin / valPrixVente) * 100 : 0;
    
    // Warning logic: Margin < 20% and Price Vente > 0
    const isLowMargin = marginPercent < 20 && valPrixVente > 0;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onAddRow();
        }
    };

    return (
        <TableRow className="hover:bg-muted/10 group">
            <TableCell className="text-center text-xs text-muted-foreground w-[40px]">
                {index + 1}
            </TableCell>
            <TableCell className="w-[180px]">
                <FormField
                    control={control}
                    name={`items.${index}.nomProduit`}
                    render={({ field }) => (
                        <FormControl>
                            <Input placeholder="Nom produit" {...field} className="h-8 text-sm" />
                        </FormControl>
                    )}
                />
            </TableCell>
            <TableCell className="w-[120px]">
                <FormField
                    control={control}
                    name={`items.${index}.reference`}
                    render={({ field }) => (
                        <FormControl>
                            <Input placeholder="Réf (Auto)" {...field} className="h-8 text-xs font-mono" />
                        </FormControl>
                    )}
                />
            </TableCell>
            <TableCell className="min-w-[130px]">
                 <FormField
                    control={control}
                    name={`items.${index}.marqueId`}
                    render={({ field }) => (
                        <SearchableSelect
                            options={brands.map((b: any) => ({ label: b.name, value: b.id }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Marque"
                            className="h-8 text-sm"
                            onCreateNew={(name) => handleQuickCreate('brands', name, setBrands, `items.${index}.marqueId`)}
                            isCreating={isCreatingSetting}
                        />
                    )}
                />
            </TableCell>
            <TableCell className="min-w-[130px]">
                <FormField
                    control={control}
                    name={`items.${index}.categorieId`}
                    render={({ field }) => (
                        <SearchableSelect
                            options={categories.map((c: any) => ({ label: c.name, value: c.id }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Catégorie"
                            className="h-8 text-sm"
                            onCreateNew={(name) => handleQuickCreate('categories', name, setCategories, `items.${index}.categorieId`)}
                            isCreating={isCreatingSetting}
                        />
                    )}
                />
            </TableCell>
            <TableCell className="min-w-[100px]">
                <FormField
                    control={control}
                    name={`items.${index}.matiereId`}
                    render={({ field }) => (
                        <SearchableSelect
                            options={materials.map((m: any) => ({ label: m.name, value: m.id }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Matière"
                            className="h-8 text-sm"
                            onCreateNew={(name) => handleQuickCreate('materials', name, setMaterials, `items.${index}.matiereId`)}
                            isCreating={isCreatingSetting}
                        />
                    )}
                />
            </TableCell>
            <TableCell className="min-w-[100px]">
                <FormField
                    control={control}
                    name={`items.${index}.couleurId`}
                    render={({ field }) => (
                        <SearchableSelect
                            options={colors.map((c: any) => ({ label: c.name, value: c.id }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Couleur"
                            className="h-8 text-sm"
                            onCreateNew={(name) => handleQuickCreate('colors', name, setColors, `items.${index}.couleurId`)}
                            isCreating={isCreatingSetting}
                        />
                    )}
                />
            </TableCell>
            <TableCell className="w-[100px]">
                <FormField
                    control={control}
                    name={`items.${index}.prixAchat`}
                    render={({ field }) => (
                        <FormControl>
                           <Input type="number" step="0.01" {...field} className="h-8 text-right pr-2" />
                        </FormControl>
                    )}
                />
            </TableCell>
            <TableCell className="w-[100px]">
                <FormField
                    control={control}
                    name={`items.${index}.prixVente`}
                    render={({ field }) => (
                        <FormControl>
                            <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                className={cn(
                                    "h-8 text-right pr-2 font-medium transition-colors duration-300",
                                    isLowMargin ? "border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500" : "text-green-700"
                                )} 
                            />
                        </FormControl>
                    )}
                />
            </TableCell>
            <TableCell className="w-[60px] text-center">
                 <span className={cn(
                     "text-xs font-bold block", 
                     isLowMargin ? "text-red-500" : "text-green-600"
                 )}>
                    {isFinite(marginPercent) ? `${marginPercent.toFixed(0)}%` : '-'}
                 </span>
            </TableCell>
            <TableCell className="w-[70px]">
                <FormField
                    control={control}
                    name={`items.${index}.quantiteStock`}
                    render={({ field }) => (
                        <FormControl>
                            <Input 
                                type="number" 
                                {...field} 
                                className="h-8 text-center" 
                                onKeyDown={handleKeyDown}
                            />
                        </FormControl>
                    )}
                />
            </TableCell>
            <TableCell className="w-[50px] text-right p-0">
                <div className="flex items-center justify-end gap-1 px-2">
                    {!isEditMode && (
                        <>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => duplicate(index)} title="Dupliquer">
                                <Copy className="h-3 w-3" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(index)} title="Supprimer">
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}
