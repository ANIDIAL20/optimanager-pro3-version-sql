'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, RotateCcw, Printer, FileText } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
// Remove direct PDF import to avoid SSR issues
// import { PDFViewer } from '@react-pdf/renderer'; 
// import { PdfDocumentTemplate } from '@/components/documents/pdf-document-template';

const DocumentPreviewClient = dynamic(
    () => import('@/components/settings/document-preview-client'),
    { 
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <span className="text-sm">Chargement de l'aperçu...</span>
            </div>
        )
    }
);
import { DEFAULT_DOCUMENT_SETTINGS, DocumentSettings, DocType } from '@/lib/document-settings-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';

// Mock data for preview
const PREVIEW_DATA = {
    document: {
        id: 999,
        saleNumber: 'FAC-DEMO-001',
        createdAt: new Date().toISOString(),
        totalHT: 1500,
        totalTVA: 300,
        totalTTC: 1800,
        items: [
            { productName: 'Monture Ray-Ban Aviator', quantity: 1, unitPriceTTC: 1200, lineTotalTTC: 1200, brand: 'Ray-Ban' },
            { productName: 'Verres Organiques Anti-Reflet', quantity: 2, unitPriceTTC: 300, lineTotalTTC: 600, brand: 'Essilor', productType: 'lens', lensDetails: [{ eye: 'OD', sphere: '-2.00', cylinder: '-0.50' }, { eye: 'OG', sphere: '-2.00' }] },
        ]
    },
    client: {
        fullName: 'Client Démo',
        phone: '0600-000000',
        address: '123 Avenue Mohamed V, Casablanca'
    }
};

const settingsSchema = z.object({
  default: z.object({
    primaryColor: z.string().min(4).max(9),
    secondaryColor: z.string().min(4).max(9),
    fontFamily: z.enum(['Helvetica', 'Times-Roman', 'Courier']),
    layout: z.enum(['standard', 'minimalist', 'modern']),
    showFooter: z.boolean(),
    footerText: z.string().max(500).optional(),
    showLogo: z.boolean(),
    logoPosition: z.enum(['left', 'center', 'right']),
    showAddress: z.boolean().optional().default(true),
    showPhone: z.boolean().optional().default(true),
    showEmail: z.boolean().optional().default(true),
    showIce: z.boolean().optional().default(true),
    showRc: z.boolean().optional().default(true),
    showRib: z.boolean().optional().default(true),
  }),
});

interface DocumentSettingsFormProps {
    shopId: number;
    initialShopProfile?: any;
}

export function DocumentSettingsForm({ shopId, initialShopProfile }: DocumentSettingsFormProps) {
    // 🛡️ User Protection: Gate invalid shopId (Step 2 of prompt)
    if (!shopId || !Number.isFinite(shopId)) {
        console.error('[DocumentSettingsForm] Invalid shopId prop:', shopId);
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg border border-red-200">
                <h3 className="font-bold">Erreur de configuration</h3>
                <p>L'identifiant de la boutique est invalide ({String(shopId)}).</p>
                <p className="text-sm mt-2">Veuillez recharger la page.</p>
            </div>
        );
    }
    
    // Debug log as requested
    console.log('[DocumentSettingsForm] Initializing with valid shopId:', shopId);

    const queryClient = useQueryClient();
    const [previewType, setPreviewType] = useState<'facture' | 'devis'>('facture');
    
    // 1. Fetch Settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['document-settings', shopId],
        queryFn: async () => {
            const res = await fetch(`/api/shops/${shopId}/document-settings`);
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json() as Promise<DocumentSettings>;
        },
        initialData: () => {
             const base = (initialShopProfile?.documentSettings as DocumentSettings) || DEFAULT_DOCUMENT_SETTINGS;
             // Ensure defaults are always present
             if (!base.default) return DEFAULT_DOCUMENT_SETTINGS;
             return base;
        }
    });

    // 2. Form Setup
    const form = useForm<DocumentSettings>({
        resolver: zodResolver(z.object({ // Loose validation for full object
            version: z.number(),
            default: settingsSchema.shape.default,
            overrides: z.any()
        })),
        defaultValues: settings || DEFAULT_DOCUMENT_SETTINGS,
        values: settings || DEFAULT_DOCUMENT_SETTINGS // Safe fallback
    });

    // Watch for live preview - with safe fallback
    const formValues = form.watch() || DEFAULT_DOCUMENT_SETTINGS;
    const currentDefaults = formValues?.default || DEFAULT_DOCUMENT_SETTINGS.default;

    // 3. Mutation
    const { mutate: saveSettings, isPending: isSaving } = useMutation({
        mutationFn: async (data: DocumentSettings) => {
            console.log("Saving settings for Shop ID:", shopId); 
            if (!shopId) {
                toast.error("Erreur critique: Shop ID manquant");
                throw new Error("Shop ID missing");
            }
            
            const res = await fetch(`/api/shops/${shopId}/document-settings`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to save settings');
            }
            return res.json();
        },
        onSuccess: (newData) => {
            toast.success("Paramètres enregistrés avec succès");
            queryClient.setQueryData(['document-settings', shopId], newData);
        },
        onError: (err) => toast.error(`Erreur: ${err.message}`)
    });



    const onSubmit = (data: DocumentSettings) => {
        saveSettings(data);
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
            {/* LEFT: Controls */}
            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Personnalisation des Documents
                    </CardTitle>
                    <CardDescription>Modifiez l'apparence de vos factures et devis</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form id="doc-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        
                        {/* Colors */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-1">Couleurs & Style</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Couleur Principale</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="color" 
                                            className="w-12 h-10 p-1 cursor-pointer"
                                            {...form.register('default.primaryColor')} 
                                        />
                                        <Input {...form.register('default.primaryColor')} placeholder="#000000" className="flex-1" />
                                    </div>
                                    <p className="text-xs text-slate-500">Titres, total net, bordures.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Couleur Secondaire</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="color" 
                                            className="w-12 h-10 p-1 cursor-pointer"
                                            {...form.register('default.secondaryColor')} 
                                        />
                                        <Input {...form.register('default.secondaryColor')} placeholder="#000000" className="flex-1" />
                                    </div>
                                    <p className="text-xs text-slate-500">Textes secondaires, détails.</p>
                                </div>
                            </div>
                        </div>


                        {/* Visibility Options */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-1">Visibilité des informations</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="showLogoCb" 
                                        checked={currentDefaults.showLogo}
                                        onCheckedChange={(c) => form.setValue('default.showLogo', c === true, { shouldDirty: true })}
                                    />
                                    <Label htmlFor="showLogoCb" className="cursor-pointer">Logo</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="showAddress" 
                                        checked={currentDefaults.showAddress ?? true}
                                        onCheckedChange={(c) => form.setValue('default.showAddress', c === true, { shouldDirty: true })}
                                    />
                                    <Label htmlFor="showAddress" className="cursor-pointer">Adresse</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="showPhone" 
                                        checked={currentDefaults.showPhone ?? true}
                                        onCheckedChange={(c) => form.setValue('default.showPhone', c === true, { shouldDirty: true })}
                                    />
                                    <Label htmlFor="showPhone" className="cursor-pointer">Téléphone</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="showEmail" 
                                        checked={currentDefaults.showEmail ?? true}
                                        onCheckedChange={(c) => form.setValue('default.showEmail', c === true, { shouldDirty: true })}
                                    />
                                    <Label htmlFor="showEmail" className="cursor-pointer">Email</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="showIce" 
                                        checked={currentDefaults.showIce ?? true}
                                        onCheckedChange={(c) => form.setValue('default.showIce', c === true, { shouldDirty: true })}
                                    />
                                    <Label htmlFor="showIce" className="cursor-pointer">ICE / Identifiants</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="showRib" 
                                        checked={currentDefaults.showRib ?? true}
                                        onCheckedChange={(c) => form.setValue('default.showRib', c === true, { shouldDirty: true })}
                                    />
                                    <Label htmlFor="showRib" className="cursor-pointer">RIB Bancaire</Label>
                                </div>
                            </div>
                        </div>

                        {/* Typography & Layout */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-1">Mise en page</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Police d'écriture</Label>
                                    <Select 
                                        value={currentDefaults.fontFamily} 
                                        onValueChange={(v) => form.setValue('default.fontFamily', v as any, { shouldDirty: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Helvetica">Helvetica (Standard)</SelectItem>
                                            <SelectItem value="Times-Roman">Times New Roman (Classique)</SelectItem>
                                            <SelectItem value="Courier">Courier (Monospace)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Style de mise en page</Label>
                                    <Select 
                                        value={currentDefaults.layout} 
                                        onValueChange={(v) => form.setValue('default.layout', v as any, { shouldDirty: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="minimalist">Minimaliste</SelectItem>
                                            <SelectItem value="modern">Moderne</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                         {/* Logo Options */}
                         <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-1">Logo & En-tête</h3>
                            <div className="flex items-center justify-between">
                                <Label>Afficher le logo</Label>
                                <Switch 
                                    checked={currentDefaults.showLogo}
                                    onCheckedChange={(c) => form.setValue('default.showLogo', c, { shouldDirty: true })}
                                />
                            </div>
                            {currentDefaults.showLogo && (
                                <div className="space-y-2">
                                    <Label>Position du logo</Label>
                                    <div className="flex gap-2">
                                        {(['left', 'center', 'right'] as const).map((pos) => (
                                            <Button
                                                key={pos}
                                                type="button"
                                                variant={currentDefaults.logoPosition === pos ? 'default' : 'outline'}
                                                className="flex-1 capitalize"
                                                onClick={() => form.setValue('default.logoPosition', pos, { shouldDirty: true })}
                                            >
                                                {pos === 'left' ? 'Gauche' : pos === 'center' ? 'Centre' : 'Droite'}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-1">Pied de page</h3>
                            <div className="flex items-center justify-between">
                                <Label>Afficher le pied de page</Label>
                                <Switch 
                                    checked={currentDefaults.showFooter}
                                    onCheckedChange={(c) => form.setValue('default.showFooter', c, { shouldDirty: true })}
                                />
                            </div>
                            {currentDefaults.showFooter && (
                                <div className="space-y-2">
                                    <Label>Texte personnalisé (Mentions légales, IBAN...)</Label>
                                    <Textarea 
                                        {...form.register('default.footerText')} 
                                        placeholder="Ex: SARL au capital de 10.000 DH - RC 12345..."
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>

                    </form>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t p-4 flex justify-between">
                    <Button variant="ghost" onClick={() => form.reset(DEFAULT_DOCUMENT_SETTINGS)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Réinitialiser
                    </Button>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer
                    </Button>
                </CardFooter>
            </Card>

            {/* RIGHT: Live Preview */}
            <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                <div className="bg-slate-800 p-3 flex justify-between items-center border-b border-slate-700">
                    <div className="flex items-center gap-2 text-white font-medium">
                        <Printer className="h-4 w-4 text-indigo-400" />
                        Aperçu en direct
                    </div>
                    <div className="flex bg-slate-700 rounded-lg p-1">
                        <button 
                            onClick={() => setPreviewType('facture')}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${previewType === 'facture' ? 'bg-indigo-500 text-white shadow' : 'text-slate-300 hover:text-white'}`}
                        >
                            Facture
                        </button>
                        <button 
                            onClick={() => setPreviewType('devis')}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${previewType === 'devis' ? 'bg-indigo-500 text-white shadow' : 'text-slate-300 hover:text-white'}`}
                        >
                            Devis
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-slate-500/10 backdrop-blur items-center justify-center p-4 overflow-hidden">
                     {/* 
                         We use a key to force re-render when settings change slightly if needed, 
                         though React-PDF usually handles updates well.
                     */}
                     {/* 
                         We use a key to force re-render when settings change slightly if needed, 
                         though React-PDF usually handles updates well.
                     */}
                    <DocumentPreviewClient 
                        type={previewType}
                        data={{
                            document: PREVIEW_DATA.document,
                            client: PREVIEW_DATA.client,
                            settings: initialShopProfile, // Existing Shop Profile
                            documentSettings: formValues // Dynamic Settings
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
