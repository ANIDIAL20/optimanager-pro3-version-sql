'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Server Actions
import { getPrescriptions } from '@/app/actions/prescriptions-actions';
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getSettings } from '@/app/actions/settings-actions';
import { createLensOrder, type LensOrderInput } from '@/app/actions/lens-orders-actions';
import { recordAdvancePayment } from '@/app/actions/payment-actions';
import { BrandLoader } from '@/components/ui/loader-brand';
import { AdvancePaymentDialog } from '@/components/modals/advance-payment-dialog';

const LensOrderSchema = z.object({
  prescriptionId: z.coerce.string().min(1, 'Veuillez sélectionner une prescription.'),
  supplierId: z.coerce.string().min(1, 'Veuillez sélectionner un fournisseur.'),
  orderType: z.enum(['unifocal', 'bifocal', 'progressive', 'contact'], {
    required_error: "Le type de commande est requis.",
  }),
  lensType: z.string().min(1, 'Le type de verre est requis.'),

  // Professional Pricing
  sellingPrice: z.number().positive('Le prix de vente est obligatoire'),
  estimatedBuyingPrice: z.number().min(0).optional(),

  treatments: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type LensOrderFormValues = z.infer<typeof LensOrderSchema>;

interface LensOrderFormProps {
  clientId: string;
  onSuccess?: () => void;
  mode?: 'glasses' | 'contacts';
}

export function LensOrderForm({ clientId, onSuccess, mode = 'glasses' }: LensOrderFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = React.useState(false);
  const [pendingFormData, setPendingFormData] = React.useState<LensOrderFormValues | null>(null);
  const [isFinalizing, setIsFinalizing] = React.useState(false);

  // Data State
  const [prescriptions, setPrescriptions] = React.useState<any[]>([]);
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [treatments, setTreatments] = React.useState<any[]>([]);
  const [isLoadingTreatments, setIsLoadingTreatments] = React.useState(true);

  const form = useForm<LensOrderFormValues>({
    resolver: zodResolver(LensOrderSchema),
    defaultValues: {
      prescriptionId: '',
      supplierId: '',
      orderType: mode === 'contacts' ? 'contact' : 'unifocal',
      lensType: '',
      sellingPrice: 0,
      estimatedBuyingPrice: undefined,
      treatments: [],
      notes: '',
    },
  });

  // Load Data
  React.useEffect(() => {
    async function loadData() {
      setIsLoadingTreatments(true);
      try {
        const [prescriptionsRes, suppliersRes, treatmentsRes] = await Promise.all([
          getPrescriptions(clientId),
          getSuppliersList(undefined),
          getSettings('treatments'),
        ]);

        if (prescriptionsRes.success) {
          setPrescriptions(prescriptionsRes.data || []);
        }

        if (Array.isArray(suppliersRes)) {
          setSuppliers(suppliersRes);
        } else if ((suppliersRes as any).success && (suppliersRes as any).data) { // logic if wrapped
          setSuppliers((suppliersRes as any).data);
        } else {
          setSuppliers([]);
        }

        // Handle Treatments (returns Array directly)
        if (Array.isArray(treatmentsRes)) {
          setTreatments(treatmentsRes);
        } else if ((treatmentsRes as any).data) {
          setTreatments((treatmentsRes as any).data);
        }

      } catch (error) {
        console.error("Failed to load form data", error);
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les données nécessaires."
        });
      } finally {
        setIsLoadingTreatments(false);
      }
    }
    loadData();
  }, [clientId, toast]);

  // Derived State
  const selectedPrescriptionId = form.watch('prescriptionId');
  const fullSelectedPrescription = React.useMemo(() => {
    // Compare as strings to be safe
    return prescriptions.find(p => p.id?.toString() === selectedPrescriptionId) || null;
  }, [prescriptions, selectedPrescriptionId]);

  // Auto-detect order type from lens type input (UX enhancement)
  const lensTypeValue = form.watch('lensType');
  React.useEffect(() => {
    if (!lensTypeValue || mode === 'contacts') return;
    const lower = lensTypeValue.toLowerCase();
    if (lower.includes('prog')) {
      form.setValue('orderType', 'progressive');
    } else if (lower.includes('bifo')) {
      form.setValue('orderType', 'bifocal');
    } else if (lower.includes('uni') || lower.includes('simple')) {
      form.setValue('orderType', 'unifocal');
    }
  }, [lensTypeValue, form, mode]);

  const onSubmit = async (data: LensOrderFormValues) => {
    // On n'enregistre pas directement, on demande l'avance d'abord
    setPendingFormData(data);
    setShowAdvanceDialog(true);
  };

  const handleFinalSubmit = async (advanceAmount: number) => {
    if (!pendingFormData) return;
    const data = pendingFormData;

    setIsFinalizing(true);
    setIsSubmitting(true);
    try {
      // Validate conversions
      const pId = parseInt(data.prescriptionId);
      const sId = parseInt(data.supplierId);

      if (isNaN(pId)) {
        toast({ title: "Erreur", description: "Prescription invalide", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      if (isNaN(sId)) {
        toast({ title: "Erreur", description: "Fournisseur invalide", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      // Safe find using loose assumption (s.id could be number, data.supplierId is string)
      const supplier = suppliers.find(s => s.id?.toString() === data.supplierId);



      const orderInput: LensOrderInput = {
        clientId: parseInt(clientId),
        prescriptionId: pId,
        supplierId: sId,
        orderType: data.orderType,
        lensType: data.lensType,
        treatment: data.treatments?.join(', ') || null,
        supplierName: supplier?.nomCommercial || supplier?.name || 'Unknown',

        // Explicit Prescription (Mapping from prescription data object)
        sphereR: fullSelectedPrescription?.data?.od?.sphere?.toString() || null,
        cylindreR: fullSelectedPrescription?.data?.od?.cylinder?.toString() || null,
        axeR: fullSelectedPrescription?.data?.od?.axis?.toString() || null,
        additionR: (fullSelectedPrescription?.data?.od?.addition || fullSelectedPrescription?.data?.od?.add)?.toString() || null,
        hauteurR: (fullSelectedPrescription?.data?.od?.height || fullSelectedPrescription?.data?.od?.hauteur)?.toString() || null,

        sphereL: fullSelectedPrescription?.data?.og?.sphere?.toString() || null,
        cylindreL: fullSelectedPrescription?.data?.og?.cylinder?.toString() || null,
        axeL: fullSelectedPrescription?.data?.og?.axis?.toString() || null,
        additionL: (fullSelectedPrescription?.data?.og?.addition || fullSelectedPrescription?.data?.og?.add)?.toString() || null,
        hauteurL: (fullSelectedPrescription?.data?.og?.height || fullSelectedPrescription?.data?.og?.hauteur)?.toString() || null,

        ecartPupillaireR: fullSelectedPrescription?.data?.od?.pd?.toString() || null,
        ecartPupillaireL: fullSelectedPrescription?.data?.og?.pd?.toString() || null,
        diameterR: fullSelectedPrescription?.data?.od?.diameter?.toString() || null,
        diameterL: fullSelectedPrescription?.data?.og?.diameter?.toString() || null,
<<<<<<< HEAD

=======
>>>>>>> origin/nouvelle-modif

        matiere: fullSelectedPrescription?.data?.matiere || null,
        indice: fullSelectedPrescription?.data?.indice || null,

        // Professional Pricing
        sellingPrice: data.sellingPrice,
        estimatedBuyingPrice: data.estimatedBuyingPrice || 0,

        // Legacy (kept for compat)
        unitPrice: data.sellingPrice,
        quantity: 1,
        totalPrice: data.sellingPrice,

        status: 'pending',
        notes: data.notes || '',
      };

      const result = await createLensOrder(orderInput);

      if (result.success) {
        const orderId = result.data?.id;

        // Record the advance payment if any
        if (orderId && advanceAmount > 0) {
          await recordAdvancePayment({
            clientId: parseInt(clientId),
            amount: advanceAmount,
            referenceId: orderId.toString(),
            referenceType: 'LENS_ORDER',
            notes: `Avance pour commande de verres #${orderId}`
          });
        }

        toast({
          title: mode === 'contacts' ? 'Commande de lentilles créée' : 'Commande de verres créée',
          description: advanceAmount > 0
            ? `La commande a été enregistrée avec une avance de ${advanceAmount} DH.`
            : 'La nouvelle commande a été enregistrée en tant que brouillon.',
        });

        setShowAdvanceDialog(false);
        setPendingFormData(null);

        form.reset({
          prescriptionId: '',
          supplierId: '',
          orderType: mode === 'contacts' ? 'contact' : 'unifocal',
          lensType: '',
          treatments: [],
          notes: '',
          sellingPrice: 0,
          estimatedBuyingPrice: undefined
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: result.error || "Une erreur s'est produite lors de la création de la commande.",
        });
      }
    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite lors de la création de la commande.",
      });
    } finally {
      setIsSubmitting(false);
      setIsFinalizing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'contacts' ? 'Nouvelle Commande de Lentilles' : 'Nouvelle Commande de Verres'}
        </CardTitle>
        <CardDescription>
          {mode === 'contacts' ? 'Configurez la commande de lentilles.' : 'Configurez la commande pour le laboratoire.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prescription Selection */}
              <FormField
                control={form.control}
                name="prescriptionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescription</FormLabel>
                    <SearchableSelect
                      options={prescriptions.map((p) => ({
                        label: `${new Date(p.date).toLocaleDateString()} - ${p.clientName || 'Client'}`,
                        value: p.id?.toString(), // Ensure string
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Choisir une prescription"
                      searchPlaceholder="Rechercher une prescription..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Supplier Selection */}
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fournisseur</FormLabel>
                    <SearchableSelect
                      options={suppliers.map((s) => ({
                        label: s.nomCommercial || s.name,
                        value: s.id?.toString(), // Ensure string
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Choisir un fournisseur"
                      searchPlaceholder="Rechercher un fournisseur..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Selected Prescription Details */}
            {fullSelectedPrescription && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-slate-900">Détails de la correction</h4>
                </div>
<<<<<<< HEAD
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="font-semibold text-blue-700 block mb-2 border-b pb-1">Œil Droit (OD)</span>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-slate-600">
                      <div>Sph: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.od?.sphere || '-'}</span></div>
                      <div>Cyl: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.od?.cylinder || '-'}</span></div>
                      <div>Axe: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.od?.axis || '-'}</span></div>
                      <div>Add: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.od?.addition || '-'}</span></div>
                      <div className="pt-1 border-t col-span-2 mt-1"></div>
                      <div>EP: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.od?.pd || fullSelectedPrescription.data?.pd || '-'}</span></div>
                      <div>H: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.od?.hauteur || '-'}</span></div>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="font-semibold text-blue-700 block mb-2 border-b pb-1">Œil Gauche (OG)</span>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-slate-600">
                      <div>Sph: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.og?.sphere || '-'}</span></div>
                      <div>Cyl: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.og?.cylinder || '-'}</span></div>
                      <div>Axe: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.og?.axis || '-'}</span></div>
                      <div>Add: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.og?.addition || '-'}</span></div>
                      <div className="pt-1 border-t col-span-2 mt-1"></div>
                      <div>EP: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.og?.pd || fullSelectedPrescription.data?.pd || '-'}</span></div>
                      <div>H: <span className="font-medium text-slate-900">{fullSelectedPrescription.data?.og?.hauteur || '-'}</span></div>
=======
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="font-semibold text-blue-700 block mb-2 border-b border-blue-100 pb-1">Œil Droit (OD)</span>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 text-slate-600">
                      <div>Sph: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.od?.sphere || '-'}</span></div>
                      <div>Cyl: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.od?.cylinder || '-'}</span></div>
                      <div>Axe: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.od?.axis || '-'}</span>°</div>
                      <div>Add: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.od?.addition || fullSelectedPrescription.data?.od?.add || '-'}</span></div>
                      <div>EP: <span className="font-bold text-blue-700">{fullSelectedPrescription.data?.od?.pd || '-'}</span></div>
                      <div>H: <span className="font-bold text-blue-700">{fullSelectedPrescription.data?.od?.height || fullSelectedPrescription.data?.od?.hauteur || '-'}</span></div>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700 block mb-2 border-b border-blue-100 pb-1">Œil Gauche (OG)</span>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 text-slate-600">
                      <div>Sph: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.og?.sphere || '-'}</span></div>
                      <div>Cyl: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.og?.cylinder || '-'}</span></div>
                      <div>Axe: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.og?.axis || '-'}</span>°</div>
                      <div>Add: <span className="font-bold text-slate-900">{fullSelectedPrescription.data?.og?.addition || fullSelectedPrescription.data?.og?.add || '-'}</span></div>
                      <div>EP: <span className="font-bold text-blue-700">{fullSelectedPrescription.data?.og?.pd || '-'}</span></div>
                      <div>H: <span className="font-bold text-blue-700">{fullSelectedPrescription.data?.og?.height || fullSelectedPrescription.data?.og?.hauteur || '-'}</span></div>
>>>>>>> origin/nouvelle-modif
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode !== 'contacts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de commande (Géométrie)</FormLabel>
                      <SearchableSelect
                        options={[
                          { label: 'Unifocal (Vision Simple)', value: 'unifocal' },
                          { label: 'Progressif', value: 'progressive' },
                          { label: 'Bifocal (Double Foyer)', value: 'bifocal' },
                        ]}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Sélectionner le type"
                        searchPlaceholder="Rechercher un type..."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lensType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de verre (Marque/Modèle)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Essilor Varilux, Nikon Presio..." {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {mode === 'contacts' && (
<<<<<<< HEAD
               <FormField
                  control={form.control}
                  name="lensType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marque de Lentilles / Modèle</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Acuvue Oasys, Biofinity..." {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

=======
              <FormField
                control={form.control}
                name="lensType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque de Lentilles / Modèle</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Acuvue Oasys, Biofinity..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
>>>>>>> origin/nouvelle-modif
            )}



            <FormField
              control={form.control}
              name="treatments"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Traitements des verres</FormLabel>
                    <FormDescription>
                      Sélectionnez les traitements à appliquer.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {isLoadingTreatments && <BrandLoader size="sm" />}
                    {!isLoadingTreatments && treatments.length === 0 && (
                      <p className="text-sm text-slate-500 italic col-span-full">Aucun traitement configuré.</p>
                    )}
                    {treatments.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="treatments"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.name)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), item.name])
                                      : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item.name
                                        )
                                      );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ========================================
                PROFESSIONAL PRICING SECTION
               ======================================== */}
            <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 p-6 rounded-2xl border-2 border-blue-200/60 shadow-lg shadow-blue-100/50 space-y-5 overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl -z-0" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-200/20 to-transparent rounded-full blur-2xl -z-0" />

              <div className="relative z-10 flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    Tarification Professionnelle
                  </h4>
                  <p className="text-xs text-blue-600/80">Gestion intelligente des marges</p>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prix de Vente Client (OBLIGATOIRE) */}
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                        Prix de Vente Client (TTC) *
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 3500.00"
                            className="pr-14 h-11 border-2 border-blue-300/60 bg-white/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 group-hover:border-blue-400"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ''}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">DH</span>
                        </div>
                      </FormControl>
                      <FormDescription className="flex items-center gap-1.5 text-blue-700 text-xs">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Prix affiché sur la facture client
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prix d'Achat Estimé (OPTIONNEL) */}
                <FormField
                  control={form.control}
                  name="estimatedBuyingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                        <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        </svg>
                        Prix d'Achat Estimé (Fournisseur)
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 2000.00 (optionnel)"
                            className="pr-14 h-11 border-2 border-amber-200/60 bg-white/80 backdrop-blur-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition-all duration-200 group-hover:border-amber-300"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">DH</span>
                        </div>
                      </FormControl>
                      <FormDescription className="flex items-center gap-1.5 text-amber-700 text-xs">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                        </svg>
                        Validé à la réception du BL fournisseur
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Margin Preview - PREMIUM DESIGN */}
              {(() => {
                const sellingPrice = form.watch('sellingPrice') || 0;
                const estimatedBuying = form.watch('estimatedBuyingPrice') || 0;

                if (sellingPrice > 0 && estimatedBuying > 0) {
                  const margin = sellingPrice - estimatedBuying;
                  const marginRate = (margin / sellingPrice) * 100;

                  let bgGradient = 'from-red-500 to-rose-600';
                  let borderColor = 'border-red-300';
                  let textColor = 'text-red-900';
                  let iconBg = 'bg-red-500';
                  let icon = (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  );
                  let status = 'Attention: Marge faible';

                  if (marginRate >= 30) {
                    bgGradient = 'from-emerald-500 to-teal-600';
                    borderColor = 'border-emerald-300';
                    textColor = 'text-emerald-900';
                    iconBg = 'bg-emerald-500';
                    status = 'Excellent !';
                    icon = (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    );
                  } else if (marginRate >= 15) {
                    bgGradient = 'from-yellow-400 to-amber-500';
                    borderColor = 'border-yellow-300';
                    textColor = 'text-yellow-900';
                    iconBg = 'bg-yellow-500';
                    status = 'Correct';
                    icon = (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    );
                  } else if (marginRate < 0) {
                    bgGradient = 'from-rose-600 to-red-700';
                    status = 'Perte !';
                  }

                  return (
                    <div className={`relative z-10 overflow-hidden rounded-xl border-2 ${borderColor} bg-white/60 backdrop-blur-md shadow-xl`}>
                      <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-5`} />
                      <div className="relative p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 bg-gradient-to-br ${bgGradient} rounded-xl shadow-lg`}>
                            <div className="text-white">
                              {icon}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-600">{status}</p>
                            <p className="text-sm font-bold ${textColor}">Marge Prévisionnelle</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${textColor}`}>
                            {margin.toFixed(2)} <span className="text-lg">DH</span>
                          </p>
                          <p className={`text-sm font-semibold ${textColor} opacity-75`}>
                            {marginRate.toFixed(1)}% de marge
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ajoutez des notes ou des instructions spécifiques pour la commande..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting || form.formState.isSubmitting}>
              {(isSubmitting || form.formState.isSubmitting) && <BrandLoader size="sm" className="mr-2" />}
              Créer la Commande
            </Button>
          </form>
        </Form>
      </CardContent>

      <AdvancePaymentDialog
        open={showAdvanceDialog}
        onOpenChange={setShowAdvanceDialog}
        totalAmount={form.watch('sellingPrice') || 0}
        onConfirm={handleFinalSubmit}
        isSubmitting={isFinalizing}
        title={mode === 'contacts' ? "Avance sur lentilles" : "Avance sur verres"}
      />
    </Card>
  );
}
