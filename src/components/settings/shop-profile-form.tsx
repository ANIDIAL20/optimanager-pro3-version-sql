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
import { useFirestore, useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { Loader2, Upload, Building2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

const shopFormSchema = z.object({
    shopName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
    address: z.string().optional(),
    phone: z.string().optional(),
    ice: z.string().optional(),
    rib: z.string().optional(),
    logoUrl: z.string().optional(),
});

type ShopFormValues = z.infer<typeof shopFormSchema>;

export function ShopProfileForm() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useFirebase();
    const storage = getStorage();
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

    // Handle logo upload - Base64 solution to bypass CORS issues
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log('🚀 Base64 Upload: handleLogoUpload called');

        const file = event.target.files?.[0];
        if (!file) {
            console.log('⚠️ No file selected');
            return;
        }

        console.log('📄 File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Veuillez sélectionner une image valide.',
            });
            return;
        }

        // Validate file size - Base64 increases size by ~33%, so limit to 1.5MB to stay under Firestore's 1MB limit per field
        if (file.size > 1.5 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Fichier trop volumineux',
                description: "L'image ne doit pas dépasser 1.5 MB (limitation Firestore).",
            });
            return;
        }

        // ✅ Verify authentication
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.error('❌ Upload aborted: auth.currentUser is null');
            toast({
                variant: 'destructive',
                title: 'Erreur d\'authentification',
                description: 'Veuillez actualiser la page et réessayer.',
            });
            return;
        }

        console.log('✅ Auth verified. User ID:', currentUser.uid);
        setIsUploading(true);

        try {
            console.log('🎯 Converting image to Base64...');

            // Convert image to Base64
            const base64String = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();

                reader.onloadend = () => {
                    const result = reader.result as string;
                    console.log('✅ Base64 conversion completed. Length:', result.length);
                    resolve(result);
                };

                reader.onerror = () => {
                    console.error('❌ FileReader error');
                    reject(new Error('Erreur lors de la lecture du fichier'));
                };

                reader.readAsDataURL(file);
            });

            console.log('🎯 Saving to Firestore...');

            // Save Base64 string directly to Firestore
            if (!firestore) {
                throw new Error('Firestore non initialisé');
            }

            const settingsRef = doc(firestore, `stores/${currentUser.uid}/settings`, 'shop');
            await setDoc(settingsRef, {
                logoUrl: base64String,
                updatedAt: new Date().toISOString(),
            }, { merge: true }); // merge: true pour ne pas écraser les autres champs

            console.log('✅ Logo saved to Firestore successfully!');

            // Update form and preview
            form.setValue('logoUrl', base64String);
            setLogoPreview(base64String);

            toast({
                title: 'Logo téléchargé',
                description: 'Votre logo a été enregistré avec succès (Base64).',
            });

        } catch (error: any) {
            console.error('❌ Upload error:', error);

            let errorMessage = 'Impossible de télécharger le logo.';

            if (error?.message) {
                errorMessage = `Erreur: ${error.message}`;
            }

            toast({
                variant: 'destructive',
                title: 'Erreur de téléchargement',
                description: errorMessage,
            });

        } finally {
            // ✅ ALWAYS stop the spinner
            setIsUploading(false);
            console.log('🏁 Upload process completed');
        }
    };

    // Submit form
    const onSubmit = async (data: ShopFormValues) => {
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
                description: "Une erreur s'est produite lors de l'enregistrement.",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
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
                        Enregistrer les modifications
                    </Button>
                </div>
            </form>
        </Form>
    );
}
