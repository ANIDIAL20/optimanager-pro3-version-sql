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
import { Upload, Image as ImageIcon, X, Check, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useFirebase } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { Brand, Material, Category, Color, Product } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getCategoryIcon } from '@/lib/category-icons';
import { createProduct, updateProduct } from '@/app/actions/products-actions';

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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product || {
      reference: '',
      nomProduit: '',
      categorieId: '',
      marqueId: '',
      matiereId: '',
      couleurId: '',
      prixAchat: 0,
      prixVente: 0,
      quantiteStock: 0,
      stockMin: 0,
      description: '',
      imageUrl: '',
      imageHint: '',
    },
  });

  // const firestore = useFirestore(); // Keep for auxiliary queries
  const firestore = useFirestore();
  const { user } = useFirebase(); // Used for brands/categories queries

  // Data Queries (Auxiliary data stays on Firebase for now)
  const marquesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `stores/${user.uid}/marques`), orderBy('name', 'asc')) : null),
    [firestore, user]
  );
  const { data: brands, isLoading: isLoadingBrands } = useCollection<Brand>(marquesQuery);

  const matieresQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `stores/${user.uid}/matieres`), orderBy('name', 'asc')) : null),
    [firestore, user]
  );
  const { data: materials, isLoading: isLoadingMaterials } = useCollection<Material>(matieresQuery);

  const categoriesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `stores/${user.uid}/categories`), orderBy('name', 'asc')) : null),
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const couleursQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `stores/${user.uid}/couleurs`), orderBy('name', 'asc')) : null),
    [firestore, user]
  );
  const { data: colors, isLoading: isLoadingColors } = useCollection<Color>(couleursQuery);

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

  const onSubmit = async (data: ProductFormValues, stayOnPage?: boolean) => {
    // Note: Server Actions handle auth, but we check user existence for brands/other hooks context?
    // Actually secureAction handles auth on server.
    // We can proceed even if firestore hook is not ready, but we should ensure we are authenticated overall.
    // The component shouldn't mount if not auth ideally.
    
    setIsSubmitting(true);
    try {
        // Map form data to Server Action Input (French fields matched)
        // Note: brands/categories are fetched from Firebase, so we have IDs.
        // Server Action expects 'categorieId', 'marqueId' (as defined in our updated interface).
        
        const payload = {
            ...data,
            // Ensure numbers are numbers (zod coerce does this but safe to match types)
            prixAchat: data.prixAchat || 0,
            stockMin: data.stockMin, // Optional
            matiereId: data.matiereId || undefined, // undefined if empty string
            couleurId: data.couleurId || undefined,
            // Pass the names too if possible, for legacy storage if needed?
            // The new action stores IDs in text fields if names not found, 
            // but we want to store NAMES if the table expects NAMES for search.
            // Let's try to lookup the names here.
            categorie: categories?.find(c => c.id === data.categorieId)?.name,
            marque: brands?.find(b => b.id === data.marqueId)?.name,
        };

        let result;

        if (product) {
            // Update
            result = await updateProduct(product.id, payload);
        } else {
            // Create
            result = await createProduct(payload);
        }

        if (result.success) {
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
            } else {
                router.push('/produits');
                router.refresh(); // Refresh server components (like the list)
            }
        } else {
            throw new Error(result.error);
        }

    } catch (error: any) {
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingCategories}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="-- Choisir une catégorie --" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingCategories && (
                            <SelectItem value="loading" disabled>Chargement...</SelectItem>
                          )}
                          {categories?.map((cat) => {
                            const Icon = getCategoryIcon(cat.name);
                            return (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span>{cat.name}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
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

                {/* Brand with Combobox */}
                <FormField
                  control={form.control}
                  name="marqueId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Marque</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              disabled={isLoadingBrands}
                            >
                              {field.value
                                ? brands?.find((brand) => brand.id === field.value)?.name
                                : "Chercher une marque..."}
                              <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Chercher une marque..." />
                            <CommandList>
                              <CommandEmpty>
                                {isLoadingBrands ? 'Chargement...' : "Aucune marque trouvée."}
                              </CommandEmpty>
                              <CommandGroup>
                                {brands?.map((brand) => (
                                  <CommandItem
                                    value={brand.name}
                                    key={brand.id}
                                    onSelect={() => { form.setValue("marqueId", brand.id); }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", brand.id === field.value ? "opacity-100" : "opacity-0")} />
                                    {brand.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matiereId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matière</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingMaterials}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="-- Choisir une matière --" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingMaterials && (
                            <SelectItem value="loading" disabled>Chargement...</SelectItem>
                          )}
                          {materials?.map((mat) => (
                            <SelectItem key={mat.id} value={mat.id}>
                              {mat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="couleurId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Couleur</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingColors}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="-- Choisir une couleur --" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingColors && (
                            <SelectItem value="loading" disabled>Chargement...</SelectItem>
                          )}
                          {colors?.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              <div className="flex items-center gap-2">
                                {color.hexCode && (
                                  <div
                                    className="h-4 w-4 rounded-full border"
                                    style={{ backgroundColor: color.hexCode }}
                                  />
                                )}
                                <span>{color.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={form.handleSubmit((data) => onSubmit(data, false))}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit((data) => onSubmit(data, true))}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer & Créer un nouveau
          </Button>
        </div>
      </form>
    </Form>
  );
}
