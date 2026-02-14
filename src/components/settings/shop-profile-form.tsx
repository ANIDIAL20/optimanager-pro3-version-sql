'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Upload, Building2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import Image from 'next/image';
import { getShopProfile, upsertShopProfile } from '@/app/actions/shop-actions';

const shopFormSchema = z.object({
    shopName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
    address: z.string().optional(),
    phone: z.string().optional(),
    ice: z.string().optional(),
    rib: z.string().optional(),
    if: z.string().optional(),
    rc: z.string().optional(),
    tp: z.string().optional(),
    inpe: z.string().optional().refine(v => !v || /^\d{9}$/.test(v), { message: "INPE invalide (doit contenir 9 chiffres)" }),
    logoUrl: z.string().optional(),
});

type ShopFormValues = z.infer<typeof shopFormSchema>;

export function ShopProfileForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isUploading, setIsUploading] = React.useState(false);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<ShopFormValues>({
        resolver: zodResolver(shopFormSchema),
        defaultValues: {
            shopName: '',
            address: '',
            phone: '',
            ice: '',
            rib: '',
            if: '',
            rc: '',
            tp: '',
            inpe: '',
            logoUrl: '',
        },
    });

    // Load existing settings from SQL
    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                setIsLoading(true);
                const profile = await getShopProfile();

                if (profile) {
                    form.reset({
                        shopName: profile.shopName || '',
                        address: profile.address || '',
                        phone: profile.phone || '',
                        ice: profile.ice || '',
                        rib: profile.rib || '',
                        if: profile.if || '',
                        rc: profile.rc || '',
                        tp: profile.tp || '',
                        inpe: profile.inpe || '',
                        logoUrl: profile.logoUrl || '',
                    });
                    if (profile.logoUrl) {
                        setLogoPreview(profile.logoUrl);
                    }
                }
            } catch (error) {
                console.error('Error loading shop profile:', error);
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: 'Impossible de charger les paramètres.',
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [form, toast]);

    // Handle logo upload - Base64 solution
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Veuillez sélectionner une image valide.',
            });
            return;
        }

        // Validate file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Fichier trop volumineux',
                description: "L'image ne doit pas dépasser 2 MB.",
            });
            return;
        }

        // Validate required fields before upload
        const currentValues = form.getValues();
        if (!currentValues.shopName || currentValues.shopName.length < 2) {
            toast({
                variant: 'destructive',
                title: 'Champ requis manquant',
                description: 'Veuillez d\'abord entrer le nom de votre boutique (minimum 2 caractères).',
            });
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setIsUploading(true);

        try {
            // Convert image to Base64
            const base64String = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();

                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result);
                };

                reader.onerror = () => {
                    reject(new Error('Erreur lors de la lecture du fichier'));
                };

                reader.readAsDataURL(file);
            });

            // Save via server action
            await upsertShopProfile({
                ...currentValues,
                logoUrl: base64String,
            });

            // Update form and preview
            form.setValue('logoUrl', base64String);
            setLogoPreview(base64String);

            toast({
                title: 'Logo téléchargé',
                description: 'Votre logo a été enregistré avec succès.',
            });

        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur de téléchargement',
                description: error?.message || 'Impossible de télécharger le logo.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Submit form
    const onSubmit = async (data: ShopFormValues) => {
        try {
            await upsertShopProfile(data);

            toast({
                title: 'Paramètres enregistrés',
                description: 'Vos paramètres de boutique ont été mis à jour.',
            });
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: error?.message || "Une erreur s'est produite lors de l'enregistrement.",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <BrandLoader size="md" className="mx-auto text-slate-400" />
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Logo Upload */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Logo de la Boutique
                        </CardTitle>
                        <CardDescription>
                            Ce logo apparaîtra sur vos factures et documents
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-6">
                            {/* Logo Preview */}
                            <div className="flex-shrink-0">
                                {logoPreview ? (
                                    <div className="relative h-32 w-32 rounded-lg border-2 border-slate-200 overflow-hidden bg-white p-2">
                                        <Image
                                            src={logoPreview}
                                            alt="Logo preview"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-32 w-32 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                                        <Building2 className="h-12 w-12 text-slate-400" />
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}


                            {/* Upload/Remove Buttons */}
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <BrandLoader size="xs" className="mr-2 inline-flex" />
                                                Téléchargement...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4" />
                                                {logoPreview ? 'Modifier le logo' : 'Télécharger un logo'}
                                            </>
                                        )}
                                    </Button>

                                    {logoPreview && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={async () => {
                                                if (confirm("Êtes-vous sûr de vouloir supprimer le logo ?")) {
                                                    try {
                                                        const currentValues = form.getValues();
                                                        // Update server
                                                        await upsertShopProfile({
                                                            ...currentValues,
                                                            logoUrl: "", // Clear logo
                                                        });
                                                        // Update local state
                                                        form.setValue('logoUrl', "");
                                                        setLogoPreview(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                                        
                                                        toast({
                                                            title: "Logo supprimé",
                                                            description: "Le logo de la boutique a été retiré.",
                                                        });
                                                    } catch (error) {
                                                        toast({
                                                            variant: "destructive",
                                                            title: "Erreur",
                                                            description: "Impossible de supprimer le logo.",
                                                        });
                                                    }
                                                }
                                            }}
                                            disabled={isUploading}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Supprimer
                                        </Button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500">
                                    PNG, JPG jusqu'à 2MB. Format recommandé: 500x500px
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Shop Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informations de la Boutique</CardTitle>
                        <CardDescription>
                            Ces informations seront affichées sur vos factures
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="shopName"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Nom de la Boutique <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Mon Optique" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Adresse</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="123 Rue de la République, Casablanca"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Téléphone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="0522-123456" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="ice"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ICE (Identifiant Fiscal)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="001234567000089" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Identifiant Commun de l'Entreprise
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* NEW LEGAL FIELDS */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="md:col-span-2">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Informations Légales (Maroc)
                                </h4>
                             </div>

                             <FormField
                                control={form.control}
                                name="if"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Identifiant Fiscal (IF)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="12345678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="rc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Registre Commerce (RC)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="12345" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Taxe Pro (TP/Patente)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="12345678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="inpe"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>INPE (9 chiffres)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123456789" {...field} maxLength={9} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="rib"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>RIB (Relevé d'Identité Bancaire)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 456 789..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && (
                            <BrandLoader size="xs" className="mr-2 inline-flex" />
                        )}
                        Enregistrer les modifications
                    </Button>
                </div>
            </form>
        </Form>
    );
}
