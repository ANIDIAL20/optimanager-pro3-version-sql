'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import { 
    Eye, 
    Info, 
    Glasses, 
    ShoppingCart, 
    User, 
    Stethoscope, 
    Settings2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandLoader } from '@/components/ui/loader-brand';
import { Badge } from '@/components/ui/badge';

// Actions
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getSettings } from '@/app/actions/settings-actions';

const SaisieMesuresVerresSchema = z.object({
    // --- Prescription Part ---
    OD: z.object({
        sph: z.coerce.number().nullable().optional(),
        cyl: z.coerce.number().nullable().optional(),
        axis: z.coerce.number().int().min(0).max(180).nullable().optional(),
        add: z.coerce.number().nullable().optional(),
        pd: z.coerce.number().nullable().optional(),
        hauteur: z.coerce.number().nullable().optional(),
    }),
    OS: z.object({
        sph: z.coerce.number().nullable().optional(),
        cyl: z.coerce.number().nullable().optional(),
        axis: z.coerce.number().int().min(0).max(180).nullable().optional(),
        add: z.coerce.number().nullable().optional(),
        pd: z.coerce.number().nullable().optional(),
        hauteur: z.coerce.number().nullable().optional(),
    }),
    PD: z.coerce.number().nullable().optional(),
    doctorName: z.string().optional(),
    prescriptionDate: z.string().optional(),

    // --- Lens Order Part ---
    supplierId: z.string().min(1, 'Veuillez sélectionner un fournisseur.'),
    orderType: z.enum(['unifocal', 'bifocal', 'progressive', 'contact']),
    lensType: z.string().min(1, 'Le type de verre est requis.'),
    index: z.string().optional(), // 🆕 Index (1.5, 1.6, etc.)
    purchasePrice: z.coerce.number().min(0).optional().default(0), // 🆕 Prix d'achat estimé
    sellingPrice: z.coerce.number().min(0, 'Le prix de vente est obligatoire'),
    treatments: z.array(z.string()).optional(),
    notes: z.string().optional(),
});

type SaisieMesuresVerresValues = z.infer<typeof SaisieMesuresVerresSchema>;

interface SaisieMesuresVerresProps {
    onAddToCart: (data: any) => void;
}

export function SaisieMesuresVerres({ onAddToCart }: SaisieMesuresVerresProps) {
    const { toast } = useToast();
    const [suppliers, setSuppliers] = React.useState<any[]>([]);
    const [treatmentsList, setTreatmentsList] = React.useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = React.useState(true);

    const form = useForm<SaisieMesuresVerresValues>({
        resolver: zodResolver(SaisieMesuresVerresSchema),
        defaultValues: {
            OD: { sph: 0, cyl: 0, axis: 0, add: 0, pd: 0, hauteur: 0 },
            OS: { sph: 0, cyl: 0, axis: 0, add: 0, pd: 0, hauteur: 0 },
            PD: 0,
            doctorName: '',
            prescriptionDate: new Date().toISOString().split('T')[0],
            supplierId: '',
            orderType: 'unifocal',
            lensType: '',
            index: '1.5',
            purchasePrice: 0,
            sellingPrice: 0,
            treatments: [],
            notes: '',
        },
    });

    // 🚀 Robust Auto-detection for Lens Geometry
    const lensTypeValue = form.watch('lensType');
    React.useEffect(() => {
        if (!lensTypeValue) return;
        const lower = lensTypeValue.toLowerCase();
        
        const KEYWORDS = {
            progressive: ['prog', 'mult', 'vari', 'office', 'degress'],
            bifocal: ['bifo', 'double'],
            unifocal: ['uni', 'simpl', 'monofocal', 'sv', 'vision simple']
        };

        if (KEYWORDS.progressive.some(k => lower.includes(k))) form.setValue('orderType', 'progressive');
        else if (KEYWORDS.bifocal.some(k => lower.includes(k))) form.setValue('orderType', 'bifocal');
        else if (KEYWORDS.unifocal.some(k => lower.includes(k))) form.setValue('orderType', 'unifocal');
    }, [lensTypeValue, form]);

    React.useEffect(() => {
        async function loadData() {
            try {
                const [suppliersRes, treatmentsRes] = await Promise.all([
                    getSuppliersList(),
                    getSettings('treatments'),
                ]);

                if (Array.isArray(suppliersRes)) setSuppliers(suppliersRes);
                else if ((suppliersRes as any).success) setSuppliers((suppliersRes as any).data);

                if (Array.isArray(treatmentsRes)) setTreatmentsList(treatmentsRes);
                else if ((treatmentsRes as any).success) setTreatmentsList((treatmentsRes as any).data);

            } catch (error) {
                console.error("Failed to load reference data", error);
            } finally {
                setIsLoadingData(false);
            }
        }
        loadData();
    }, []);

    const onSubmit = (values: SaisieMesuresVerresValues) => {
        const supplier = suppliers.find(s => s.id.toString() === values.supplierId);
        const supplierName = supplier ? (supplier.nomCommercial || supplier.name) : 'Fournisseur externe';

        onAddToCart({ ...values, supplierName });
        toast({
            title: "Pack Verres ajouté",
            description: `${values.lensType} ajouté au panier avec les mesures.`,
        });
        // Reset form or keep values? Let's reset but maybe keep dates/doctor if multi-entry
        form.reset({
            ...form.getValues(),
            lensType: '',
            sellingPrice: 0,
            treatments: [],
            notes: ''
        });
    };

    if (isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <BrandLoader size="lg" />
                <p className="mt-4 text-slate-500 font-medium">Préparation du plan de travail...</p>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* 1. Correction Optique (Mesures) */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                <Stethoscope className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">1. Correction Optique</CardTitle>
                                <CardDescription>Saisissez les mesures de l'ordonnance</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* OD Column */}
                            <div className="space-y-4 p-5 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2 border-b border-blue-100 pb-2 mb-4">
                                    <span className="w-6 h-6 bg-blue-600 text-white rounded-md flex items-center justify-center text-[10px]">OD</span>
                                    Œil Droit
                                </h4>
                                <div className="grid grid-cols-4 gap-3">
                                    {['sph', 'cyl', 'axis', 'add'].map((field) => (
                                        <FormField
                                            key={`OD.${field}`}
                                            control={form.control}
                                            name={`OD.${field}` as any}
                                            render={({ field: fProps }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">
                                                        {field === 'sph' ? 'Sphère' : field === 'cyl' ? 'Cylindre' : field === 'axis' ? 'Axe' : 'Add'}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type="number" 
                                                            step={field === 'axis' ? '1' : '0.25'} 
                                                            className="h-10 bg-white font-bold text-center border-blue-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all rounded-lg"
                                                            {...fProps} 
                                                            value={fProps.value ?? ''}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3 max-w-[50%]">
                                    {['pd', 'hauteur'].map((field) => (
                                        <FormField
                                            key={`OD.${field}`}
                                            control={form.control}
                                            name={`OD.${field}` as any}
                                            render={({ field: fProps }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">{field === 'pd' ? 'EP' : 'Hauteur'}</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type="number" 
                                                            step="0.25" 
                                                            className="h-10 bg-white font-bold text-center border-blue-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all rounded-lg"
                                                            {...fProps} 
                                                            value={fProps.value ?? ''}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* OS Column */}
                            <div className="space-y-4 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                                <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2 border-b border-emerald-100 pb-2 mb-4">
                                    <span className="w-6 h-6 bg-emerald-600 text-white rounded-md flex items-center justify-center text-[10px]">OG</span>
                                    Œil Gauche
                                </h4>
                                <div className="grid grid-cols-4 gap-3">
                                    {['sph', 'cyl', 'axis', 'add'].map((field) => (
                                        <FormField
                                            key={`OS.${field}`}
                                            control={form.control}
                                            name={`OS.${field}` as any}
                                            render={({ field: fProps }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">
                                                        {field === 'sph' ? 'Sphère' : field === 'cyl' ? 'Cylindre' : field === 'axis' ? 'Axe' : 'Add'}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type="number" 
                                                            step={field === 'axis' ? '1' : '0.25'} 
                                                            className="h-10 bg-white font-bold text-center border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all rounded-lg"
                                                            {...fProps} 
                                                            value={fProps.value ?? ''}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3 max-w-[50%]">
                                    {['pd', 'hauteur'].map((field) => (
                                        <FormField
                                            key={`OS.${field}`}
                                            control={form.control}
                                            name={`OS.${field}` as any}
                                            render={({ field: fProps }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">{field === 'pd' ? 'EP' : 'Hauteur'}</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type="number" 
                                                            step="0.25" 
                                                            className="h-10 bg-white font-bold text-center border-emerald-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all rounded-lg"
                                                            {...fProps} 
                                                            value={fProps.value ?? ''}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Additional Info Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                             <FormField
                                control={form.control}
                                name="PD"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700">Écart Pupillaire Total</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.5" className="bg-slate-50" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="doctorName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700">Médecin Prescripteur</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Dr. ..." className="bg-slate-50" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="prescriptionDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700">Date Ordonnance</FormLabel>
                                        <FormControl>
                                            <Input type="date" className="bg-slate-50" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Détails des Verres */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                <Settings2 className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">2. Configuration des Verres</CardTitle>
                                <CardDescription>Sélectionnez le fournisseur et le type de traitement</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="supplierId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700 uppercase">Fournisseur</FormLabel>
                                        <SearchableSelect
                                            options={suppliers.map(s => ({ label: s.nomCommercial || s.name, value: s.id.toString() }))}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Choisir l'usine..."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="orderType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700 uppercase">Type de Verre (Géométrie)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-10 bg-slate-50">
                                                    <SelectValue placeholder="Géométrie..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="unifocal">Unifocal (Vision Simple)</SelectItem>
                                                <SelectItem value="progressive">Progressif</SelectItem>
                                                <SelectItem value="bifocal">Bifocal</SelectItem>
                                                <SelectItem value="contact">Lentilles</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="lensType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700 uppercase">Marque & Modèle (Désignation)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Essilor Varilux Comfort Max..." className="h-12 bg-white text-lg font-medium border-2 border-indigo-100 focus:border-indigo-500" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="index"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700 uppercase">Indice (Index)</FormLabel>
                                        <FormControl>
                                            <SearchableSelect 
                                                options={[
                                                    { label: '1.5 (Standard)', value: '1.5' },
                                                    { label: '1.56 (Moyen)', value: '1.56' },
                                                    { label: '1.6 (Aminci)', value: '1.6' },
                                                    { label: '1.67 (Extra aminci)', value: '1.67' },
                                                    { label: '1.74 (Ultra aminci)', value: '1.74' },
                                                ]}
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Sélectionner l'indice"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <FormLabel className="text-xs font-bold text-slate-700 uppercase">Traitements optionnels</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {treatmentsList.map((t) => (
                                    <FormField
                                        key={t.id}
                                        control={form.control}
                                        name="treatments"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(t.name)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), t.name])
                                                                : field.onChange(field.value?.filter(v => v !== t.name));
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="text-xs font-medium cursor-pointer">{t.name}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Tarification & Marge */}
                        <div className="bg-gradient-to-br from-indigo-700 to-blue-900 p-8 rounded-2xl text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                             {/* Decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full blur-xl -ml-10 -mb-10" />

                            <div className="relative z-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Prix d'Achat */}
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-200">Prix d'Achat (HT/TTC)</h4>
                                            <p className="text-blue-300/80 text-[10px]">Utilisé pour calculer votre marge bénéficiaire</p>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="purchasePrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Input 
                                                                type="number" 
                                                                className="h-14 bg-white/5 border-2 border-white/10 text-2xl font-bold text-white placeholder:text-white/20 text-center rounded-2xl focus:bg-white/10 focus:border-white/40 transition-all"
                                                                {...field}
                                                                placeholder="0.00"
                                                            />
                                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/30">DH (Achat)</span>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Prix de Vente */}
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-300">Prix de Vente TTC</h4>
                                            <p className="text-emerald-400/80 text-[10px]">Prix final facturé au client</p>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="sellingPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Input 
                                                                type="number" 
                                                                className="h-14 bg-emerald-500/10 border-2 border-emerald-500/30 text-2xl font-black text-emerald-50 placeholder:text-emerald-200/20 text-center rounded-2xl focus:bg-emerald-500/20 focus:border-emerald-400 transition-all"
                                                                {...field}
                                                                placeholder="0.00"
                                                            />
                                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-300/50">DH (Vente)</span>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-red-300 text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <Separator className="bg-white/10" />

                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                            <p className="text-blue-200 text-[10px] font-bold uppercase mb-1">Marge Estimée</p>
                                            <p className="text-3xl font-black tabular-nums">
                                                {(form.watch('sellingPrice') - form.watch('purchasePrice')).toFixed(2)} <span className="text-sm font-bold text-blue-300">DH</span>
                                            </p>
                                        </div>
                                        <div className="hidden lg:block">
                                            <p className="text-blue-200 text-[10px] font-bold uppercase mb-1">Rentabilité</p>
                                            <p className="text-xl font-bold text-emerald-400">
                                                {form.watch('purchasePrice') > 0 ? (((form.watch('sellingPrice') - form.watch('purchasePrice')) / form.watch('purchasePrice')) * 100).toFixed(0) : '0'}%
                                            </p>
                                        </div>
                                    </div>

                                    <Button 
                                        type="submit" 
                                        size="lg"
                                        disabled={form.formState.isSubmitting}
                                        className="h-16 w-full md:w-auto px-10 bg-white text-indigo-900 hover:bg-blue-50 font-black text-lg rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex gap-3 whitespace-nowrap"
                                    >
                                        <ShoppingCart className="h-6 w-6 text-indigo-600" />
                                        AJOUTER AU PANIER
                                    </Button>
                                </div>
                            </div>
                        </div>

                         <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700 uppercase px-1">Notes Internes</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Instructions pour l'atelier ou le fournisseur..."
                                            className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}

// Sub-components as defined in the native Shadcn template would go here 
// for cleaner code, but for this refactoring we keep it cohesive.

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
