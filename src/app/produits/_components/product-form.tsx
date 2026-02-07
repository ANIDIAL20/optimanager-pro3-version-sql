'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Upload, Image as ImageIcon, X, Check, Plus } from 'lucide-react';
// TODO: Migrate settings (brands/categories/materials/colors) to SQL
// import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useFirebase } from '@/firebase';
// import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { Brand, Material, Category, Color, Product } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getCategoryIcon } from '@/lib/category-icons';
import { createProduct, updateProduct } from '@/app/actions/products-actions';
import { getBrands, getCategories, getMaterials, getColors, createSetting } from '@/app/actions/settings-actions';
import { SearchableSelect } from '@/components/ui/searchable-select';

const ProductSchema = z.object({
  reference: z.string().min(1, 'La référence est requise.'),
  nomProduit: z.string().min(1, 'Le nom du produit est requis.'),
  categorieId: z.string().min(1, 'La catégorie est requise.'),
  marqueId: z.string().min(1, 'La marque est requise.'),
  matiereId: z.string().optional(),
  couleurId: z.string().optional(),
  prixAchat: z.coerce.number().optional(),
  prixVente: z.coerce.number().min(0, 'Le prix de vente est requis.'),
  quantiteStock: z.coerce.number().min(0, 'La quantité est requise.'),
  stockMin: z.coerce.number().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  imageHint: z.string().optional(),
});

type ProductFormValues = z.infer<typeof ProductSchema>;

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = React.useState<string | null>(product?.imageUrl || null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Settings State
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [colors, setColors] = React.useState<Color[]>([]);

  // Search State for Quick Add
  const [searchBrand, setSearchBrand] = React.useState("");
  const [searchCategory, setSearchCategory] = React.useState("");
  const [searchMaterial, setSearchMaterial] = React.useState("");
  const [searchColor, setSearchColor] = React.useState("");

  // Open State for Popovers
  const [openBrand, setOpenBrand] = React.useState(false);
  const [openCategory, setOpenCategory] = React.useState(false);
  const [openMaterial, setOpenMaterial] = React.useState(false);
  const [openColor, setOpenColor] = React.useState(false);

  // Loading States
  const [isLoadingBrands, setIsLoadingBrands] = React.useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = React.useState(true);
  const [isLoadingColors, setIsLoadingColors] = React.useState(true);
  const [isCreatingSetting, setIsCreatingSetting] = React.useState(false);

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const [b, c, m, col] = await Promise.all([
          getBrands(),
          getCategories(),
          getMaterials(),
          getColors()
        ]);
        // Adapt Drizzle types (id: number) to Component types (id: string) if needed
        // Or just cast them if compatible enough for display.
        // We convert IDs to string to match Select value expectations
        setBrands(b.map(x => ({ ...x, id: x.id.toString() } as any)));
        setCategories(c.map(x => ({ ...x, id: x.id.toString() } as any)));
        setMaterials(m.map(x => ({ ...x, id: x.id.toString() } as any)));
        setColors(col.map(x => ({ ...x, id: x.id.toString() } as any)));
      } catch (err) {
        console.error("Error loading settings:", err);
        toast({
            title: "Erreur de chargement",
            description: "Impossible de charger les paramètres (marques, catégories...)",
            variant: "destructive"
        });
      } finally {
        setIsLoadingBrands(false);
        setIsLoadingCategories(false);
        setIsLoadingMaterials(false);
        setIsLoadingColors(false);
      }
    }
    loadSettings();
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      reference: product?.reference ?? '',
      nomProduit: product?.nomProduit ?? '',
      categorieId: product?.categorieId?.toString() ?? '',
      marqueId: product?.marqueId?.toString() ?? '',
      matiereId: product?.matiereId?.toString() ?? '',
      couleurId: product?.couleurId?.toString() ?? '',
      prixAchat: product?.prixAchat ?? 0,
      prixVente: product?.prixVente ?? 0,
      quantiteStock: product?.quantiteStock ?? 0,
      stockMin: product?.stockMin ?? 0,
      description: product?.description ?? '',
      imageUrl: product?.imageUrl ?? '',
      imageHint: product?.imageHint ?? '',
    },
  });

  // Watch for margin calculation
  const watchPrixAchat = form.watch('prixAchat');
  const watchPrixVente = form.watch('prixVente');

  const margin = React.useMemo(() => {
    const purchase = Number(watchPrixAchat);
    const sale = Number(watchPrixVente);
    if (sale > 0 && purchase > 0) {
      const profit = sale - purchase;
      const marginPercentage = (profit / sale) * 100;
      return marginPercentage;
    }
    return 0;
  }, [watchPrixAchat, watchPrixVente]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Create Handler
  const handleQuickCreate = async (
    type: 'brands' | 'categories' | 'materials' | 'colors',
    name: string,
    setSearch: (val: string) => void,
    setList: React.Dispatch<React.SetStateAction<any[]>>,
    fieldWithId: string,
    setOpen: (val: boolean) => void
  ) => {
    if (!name.trim()) return;
    
    setIsCreatingSetting(true);
    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      // Note: We don't update list optimistically here because actual ID is needed for relationship.
      // But we could display it. For now, wait for server response.
      
      const created = await createSetting(type, { name: name.trim() });
      
      if (created) {
        const newItem = { ...created, id: created.id.toString() };
        setList((prev) => [...prev, newItem]);
        form.setValue(fieldWithId as any, newItem.id); // Typings are loose here
        setSearch("");
        setOpen(false);
        toast({
          title: "Ajouté !",
          description: `${name} a été ajouté à la liste.`
        });
      }
    } catch (error: any) {
      console.error("Quick create error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer l'élément."
      });
    } finally {
        setIsCreatingSetting(false);
    }
  };

  const onSubmit = async (data: ProductFormValues, stayOnPage?: boolean) => {
    setIsSubmitting(true);
    try {
        // Map form data to Server Action Input
        const payload = {
            ...data,
            prixAchat: data.prixAchat || 0,
            stockMin: data.stockMin,
            matiereId: data.matiereId || undefined,
            couleurId: data.couleurId || undefined,
            // Lookup names using the IDs
            categorie: categories?.find(c => c.id === data.categorieId)?.name,
            marque: brands?.find(b => b.id === data.marqueId)?.name,
            shouldRedirect: !stayOnPage
        };

        let result;

        if (product) {
            result = await updateProduct(product.id, payload);
        } else {
            result = await createProduct(payload);
        }

        if (result && result.success) {
             toast({
              title: product ? 'Produit modifié' : 'Produit ajouté',
              description: result.message || `Le produit "${data.nomProduit}" a été enregistré.`,
            });
            
            if (stayOnPage) {
                form.reset({
                  reference: '',
                  nomProduit: '',
                  categorieId: '',
                  marqueId: '',
                  prixVente: 0,
                  quantiteStock: 0,
                  prixAchat: 0,
                  stockMin: 0,
                  description: '',
                  imageUrl: '',
                  imageHint: '',
                  couleurId: '',
                  matiereId: ''
                });
                setImagePreview(null);
            }
            // If redirecting, server action handles it via redirect() which throws NEXT_REDIRECT
        } else {
            if (result?.error) throw new Error(result.error);
        }

    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT' || error.digest === 'NEXT_REDIRECT') {
          return;
      }
      console.error("Submit Error:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || "Une erreur s'est produite. Veuillez réessayer.",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">

            {/* Card 1: General Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informations Générales</CardTitle>
                <CardDescription>
                  Détails de base du produit
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: RAYB-3025-BLK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nomProduit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du Produit</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ray-Ban Aviator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={form.control}
                  name="categorieId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Catégorie</FormLabel>
                      <SearchableSelect
                        options={categories.map((cat) => ({
                          label: cat.name,
                          value: cat.id,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Choisir ou créer une catégorie..."
                        searchPlaceholder="Chercher une catégorie..."
                        disabled={isLoadingCategories}
                        onCreateNew={async (name) => {
                          await handleQuickCreate('categories', name, setSearchCategory, setCategories, 'categorieId', setOpenCategory)
                        }}
                        createNewLabel="Créer"
                        isCreating={isCreatingSetting}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Card 2: Characteristics */}
            <Card>
              <CardHeader>
                <CardTitle>Caractéristiques</CardTitle>
                <CardDescription>
                  Marque, matière et couleur du produit
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">

                {/* Brand with Combobox & Quick Add */}
                <FormField
                  control={form.control}
                  name="marqueId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marque</FormLabel>
                      <SearchableSelect
                        options={brands.map((brand) => ({
                          label: brand.name,
                          value: brand.id,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chercher une marque..."
                        searchPlaceholder="Chercher une marque..."
                        disabled={isLoadingBrands}
                        onCreateNew={async (name) => {
                          await handleQuickCreate('brands', name, setSearchBrand, setBrands, 'marqueId', setOpenBrand)
                        }}
                        createNewLabel="Créer"
                        isCreating={isCreatingSetting}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Material with Combobox & Quick Add */}
                <FormField
                  control={form.control}
                  name="matiereId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matière</FormLabel>
                      <SearchableSelect
                        options={materials.map((mat) => ({
                          label: mat.name,
                          value: mat.id,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chercher une matière..."
                        searchPlaceholder="Chercher une matière..."
                        disabled={isLoadingMaterials}
                        onCreateNew={async (name) => {
                          await handleQuickCreate('materials', name, setSearchMaterial, setMaterials, 'matiereId', setOpenMaterial)
                        }}
                        createNewLabel="Créer"
                        isCreating={isCreatingSetting}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Color with Combobox & Quick Add */}
                <FormField
                  control={form.control}
                  name="couleurId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Couleur</FormLabel>
                      <SearchableSelect
                        options={colors.map((color) => ({
                          label: color.name,
                          value: color.id,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chercher une couleur..."
                        searchPlaceholder="Chercher une couleur..."
                        disabled={isLoadingColors}
                        onCreateNew={async (name) => {
                          await handleQuickCreate('colors', name, setSearchColor, setColors, 'couleurId', setOpenColor)
                        }}
                        createNewLabel="Créer"
                        isCreating={isCreatingSetting}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Card 3: Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Prix & Tarification</CardTitle>
                <CardDescription>
                  Définir les prix d'achat et de vente
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="prixAchat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix d'Achat (MAD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prixVente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix de Vente (MAD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Card 4: Stock */}
            <Card>
              <CardHeader>
                <CardTitle>Gestion du Stock</CardTitle>
                <CardDescription>
                  Gérer les niveaux d'inventaire et les alertes
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="quantiteStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité Initiale</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stockMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alerte Stock Minimum</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Card 5: Description */}
            <Card>
              <CardHeader>
                <CardTitle>Détails Additionnels</CardTitle>
                <CardDescription>
                  Informations supplémentaires sur le produit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Entrez une description détaillée du produit..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="lg:col-span-1 space-y-6">

            {/* Image Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle>Image du Produit</CardTitle>
                <CardDescription>
                  Ajouter une photo du produit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center relative bg-muted/20">
                    {imagePreview ? (
                      <>
                        <Image
                          src={imagePreview}
                          alt="Aperçu produit"
                          fill
                          className="object-contain rounded-md"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-background/50 backdrop-blur-sm"
                          onClick={() => {
                            setImagePreview(null);
                            form.setValue('imageUrl', '');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="mx-auto h-12 w-12" />
                        <p className="mt-2 text-sm">Aperçu de l'image</p>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <Button variant="outline" className="w-full" asChild>
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Télécharger une Image
                      </label>
                    </Button>
                    <Input
                      id="image-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleImageUpload}
                      accept="image/*"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Margin Card */}
            <Card>
              <CardHeader>
                <CardTitle>Marge Bénéficiaire</CardTitle>
                <CardDescription>
                  Calculée automatiquement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-4xl font-bold text-center",
                  margin < 20 ? 'text-red-600' : 'text-green-600'
                )}>
                  {margin.toFixed(1)}%
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {margin < 20 ? 'Marge faible' : 'Marge correcte'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-3 mt-6">
          <SubmitButton
            type="button"
            variant="outline"
            isLoading={isSubmitting}
            onClick={form.handleSubmit((data) => onSubmit(data, false))}
            label="Enregistrer"
            loadingLabel="Enregistrement..."
          />

          <SubmitButton
            type="button"
            isLoading={isSubmitting}
            onClick={form.handleSubmit((data) => onSubmit(data, true))}
            label="Enregistrer & Créer un nouveau"
            loadingLabel="Enregistrement..."
          />
        </div>
      </form>
    </Form>
  );
}
