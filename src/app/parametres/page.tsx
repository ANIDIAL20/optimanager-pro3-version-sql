'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { Loader2, Upload, Building2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

const shopSettingsSchema = z.object({
    shopName: z.string().min(1, 'Le nom de la boutique est requis'),
    address: z.string().optional(),
    phone: z.string().optional(),
    ice: z.string().optional(),
    rib: z.string().optional(),
    logoUrl: z.string().optional(),
});

type ShopSettingsFormValues = z.infer<typeof shopSettingsSchema>;

export default function ParametresPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useFirebase();
    const storage = getStorage();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isUploading, setIsUploading] = React.useState(false);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<ShopSettingsFormValues>({
        resolver: zodResolver(shopSettingsSchema),
        defaultValues: {
            shopName: '',
            address: '',
            phone: '',
            ice: '',
            rib: '',
            logoUrl: '',
        },
    });

    // Load existing settings
    React.useEffect(() => {
        const loadSettings = async () => {
            if (!firestore || !user) return;

            try {
                setIsLoading(true);
                const settingsRef = doc(firestore, `stores/${user.uid}/settings`, 'shop');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    const data = settingsSnap.data();
                    form.reset({
                        shopName: data.shopName || '',
                        address: data.address || '',
                        phone: data.phone || '',
                        ice: data.ice || '',
                        rib: data.rib || '',
                        logoUrl: data.logoUrl || '',
                    });
                    if (data.logoUrl) {
                        setLogoPreview(data.logoUrl);
                    }
                }
            } catch (error) {
                console.error('Error loading settings:', error);
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
    }, [firestore, user, form, toast]);

    // Handle logo upload
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Veuillez sélectionner une image valide.',
            });
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'L\'image ne doit pas dépasser 2 MB.',
            });
            return;
        }

        setIsUploading(true);
        try {
            // Create a reference to the logo file
            const logoRef = ref(storage, `logos/${user.uid}/${Date.now()}_${file.name}`);

            // Upload the file
            await uploadBytes(logoRef, file);

            // Get the download URL
            const downloadURL = await getDownloadURL(logoRef);

            // Update form and preview
            form.setValue('logoUrl', downloadURL);
            setLogoPreview(downloadURL);

            toast({
                title: 'Logo téléchargé',
                description: 'Votre logo a été téléchargé avec succès.',
            });
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de télécharger le logo.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Submit form
    const onSubmit = async (data: ShopSettingsFormValues) => {
        if (!firestore || !user) return;

        try {
            const settingsRef = doc(firestore, `stores/${user.uid}/settings`, 'shop');
            await setDoc(settingsRef, {
                ...data,
                updatedAt: new Date().toISOString(),
            });

            toast({
                title: 'Paramètres enregistrés',
                description: 'Vos paramètres de boutique ont été mis à jour.',
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Une erreur s\'est produite lors de l\'enregistrement.',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-6">
            <div className="w-fit">
                <BackButton />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900">Paramètres de la Boutique</h1>
                <p className="text-slate-600 mt-1">
                    Configurez les informations de votre boutique pour les factures
                </p>
            </div>

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
                                <div className="flex-1">
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
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Téléchargement...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Télécharger un logo
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-sm text-slate-500 mt-2">
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
                                        <FormLabel>Nom de la Boutique</FormLabel>
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
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Enregistrer les Paramètres
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
