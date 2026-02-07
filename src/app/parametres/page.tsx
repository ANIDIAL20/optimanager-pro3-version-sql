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

import { Loader2, Upload, Building2, Image as ImageIcon, Download, Database } from 'lucide-react';
import Image from 'next/image';
import { getShopSettings, updateShopSettings } from '@/app/actions/shop-settings-actions';
import { exportUserData, getBackupStats } from '@/app/actions/backup-actions';

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
    const [isLoading, setIsLoading] = React.useState(true);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isDownloadingBackup, setIsDownloadingBackup] = React.useState(false);
    const [backupStats, setBackupStats] = React.useState<any>(null);
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
             // Server action auto-handles auth check
             try {
                setIsLoading(true);
                const result = await getShopSettings();

                if (result.success && result.data) {
                    const data = result.data;
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

                // Load backup stats
                const stats = await getBackupStats();
                if (stats) {
                    setBackupStats(stats);
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
    }, [form, toast]);

    // Handle logo upload
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // Disabled for Migration
        toast({
            title: "Information",
            description: "Le téléchargement d'images est temporairement désactivé pendant la migration vers la nouvelle base de données."
        });
        /* 
        Legacy Firebase Upload Code Removed
        */
    };

    // Handle backup download
    const handleBackupDownload = async () => {
        try {
            setIsDownloadingBackup(true);
            
            // Export user data
            const backup = await exportUserData();
            
            // Create JSON blob
            const jsonStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const today = new Date().toISOString().split('T')[0];
            link.href = url;
            link.download = `backup_${today}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast({
                title: 'Backup téléchargé',
                description: `Vos données ont été sauvegardées dans backup_${today}.json`,
            });
        } catch (error) {
            console.error('Error downloading backup:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de télécharger le backup.',
            });
        } finally {
            setIsDownloadingBackup(false);
        }
    };

    // Submit form
    const onSubmit = async (data: ShopSettingsFormValues) => {
        try {
            const result = await updateShopSettings(data);

            if (result.success) {
                toast({
                    title: 'Paramètres enregistrés',
                    description: 'Vos paramètres de boutique ont été mis à jour.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: result.error || 'Une erreur s\'est produite',
                });
            }
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

                    {/* Data Backup */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Sauvegarde de Données
                            </CardTitle>
                            <CardDescription>
                                Téléchargez une copie complète de vos données pour plus de sécurité
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Stats Display */}
                            {backupStats && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-slate-900">{backupStats.clients}</p>
                                        <p className="text-xs text-slate-600">Clients</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-slate-900">{backupStats.products}</p>
                                        <p className="text-xs text-slate-600">Produits</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-slate-900">{backupStats.sales}</p>
                                        <p className="text-xs text-slate-600">Ventes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-slate-900">{backupStats.totalRecords}</p>
                                        <p className="text-xs text-slate-600">Total</p>
                                    </div>
                                </div>
                            )}

                            {/* Download Button */}
                            <div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={handleBackupDownload}
                                    disabled={isDownloadingBackup}
                                    className="w-full md:w-auto"
                                >
                                    {isDownloadingBackup ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Téléchargement en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="mr-2 h-4 w-4" />
                                            Télécharger une copie de mes données
                                        </>
                                    )}
                                </Button>
                                <p className="text-sm text-slate-500 mt-2">
                                    Format: JSON • Inclut toutes vos données (clients, produits, ventes, etc.)
                                </p>
                            </div>
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
