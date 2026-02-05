"use client";

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Actions
import { createSupplierOrder } from '@/app/actions/supplier-orders-actions';
import { getSuppliers, Supplier } from '@/app/actions/suppliers-actions';
import { OrderItemRow } from './order-item-row';

// Schema
// Order Item Schema
const orderItemSchema = z.object({
    type: z.enum(['monture', 'verre', 'lentille', 'divers'], {
        required_error: "Type requis",
    }),

    // Type-specific fields (conditional)
    marque: z.string().optional(),      // For montures
    reference: z.string().optional(),   // For montures
    couleur: z.string().optional(),     // For montures
    description: z.string().optional(), // For verres
    sphCyl: z.string().optional(),      // For verres
    typeLentille: z.string().optional(),// For lentilles
    rayon: z.string().optional(),       // For lentilles
    nomProduit: z.string().optional(),  // For divers

    // Common fields
    quantity: z.coerce.number().min(1, "Quantité min: 1"),
    unitPrice: z.coerce.number().min(0, "Prix invalide"),
});

// Main Form Schema
const formSchema = z.object({
    supplierId: z.string().min(1, "Veuillez sélectionner un fournisseur"),
    date: z.date({
        required_error: "Date requise",
    }),
    invoiceRef: z.string().optional(),
    items: z.array(orderItemSchema).min(1, "Au moins un article requis"),
    discount: z.coerce.number().min(0).optional(),
    amountPaid: z.coerce.number().min(0).optional(),
    note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateOrderButton() {
    const [open, setOpen] = React.useState(false);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            supplierId: '',
            date: new Date(),
            invoiceRef: '',
            items: [
                {
                    type: 'monture',
                    quantity: 1,
                    unitPrice: 0,
                }
            ],
            discount: 0,
            amountPaid: 0,
            note: '',
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    // Watch for auto-calculations
    const items = form.watch('items');
    const discount = form.watch('discount') || 0;
    const amountPaid = form.watch('amountPaid') || 0;

    const subtotal = React.useMemo(() => {
        return items?.reduce((sum, item) => {
            const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
            return sum + lineTotal;
        }, 0) || 0;
    }, [items]);

    const total = subtotal - discount;
    const remaining = total - amountPaid;

    // Fetch Suppliers
    React.useEffect(() => {
        if (!open) return;

        const loadSuppliers = async () => {
            setIsLoadingSuppliers(true);
            try {
                const result = await getSuppliers();
                if (result.success) {
                    setSuppliers(result.suppliers);
                } else {
                    toast({
                        title: "Erreur",
                        description: result.error || "Impossible de charger les fournisseurs",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Error loading suppliers:", error);
                toast({
                    title: "Erreur",
                    description: "Impossible de charger les fournisseurs",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingSuppliers(false);
            }
        };

        loadSuppliers();
    }, [open, toast]);

    // Submit Handler
    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        try {
            const selectedSupplier = suppliers.find(s => s.id === values.supplierId);
            const supplierName = selectedSupplier?.nomCommercial || "Fournisseur Inconnu";

            const result = await createSupplierOrder({
                supplierId: values.supplierId,
                supplierName: supplierName,
                date: values.date,
                items: values.items,
                subtotal: subtotal,
                discount: values.discount || 0,
                totalAmount: total,
                amountPaid: values.amountPaid || 0,
                invoiceRef: values.invoiceRef,
                note: values.note,
            });

            if (result.success) {
                toast({
                    title: "Succès",
                    description: "Commande créée avec succès",
                });
                setOpen(false);
                form.reset();
            } else {
                toast({
                    title: "Erreur",
                    description: result.error || "Une erreur est survenue",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur Critique",
                description: "Erreur lors de la création",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Commande
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nouvelle Commande Fournisseur</DialogTitle>
                    <DialogDescription>
                        Enregistrez une commande détaillée avec articles.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Header Section */}
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                            <FormField
                                control={form.control}
                                name="supplierId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fournisseur</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={isLoadingSuppliers ? "Chargement..." : "Sélectionner un fournisseur"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {suppliers.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.nomCommercial}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Date Commande</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP", { locale: fr })
                                                            ) : (
                                                                <span>Choisir</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date > new Date() || date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="invoiceRef"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Référence BL/Facture (Optionnel)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: BL-2026-001" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Articles</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({
                                        type: 'monture',
                                        quantity: 1,
                                        unitPrice: 0,
                                    })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter un article
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <OrderItemRow
                                    key={field.id}
                                    index={index}
                                    form={form}
                                    onRemove={() => remove(index)}
                                    canRemove={fields.length > 1}
                                />
                            ))}
                        </div>

                        {/* Financial Summary */}
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Sous-total:</span>
                                <span className="font-medium">{subtotal.toFixed(2)} MAD</span>
                            </div>

                            <FormField
                                control={form.control}
                                name="discount"
                                render={({ field }) => (
                                    <div className="flex items-center gap-3">
                                        <FormLabel className="text-sm text-slate-600 min-w-[100px]">Remise:</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                className="h-9 flex-1"
                                                {...field}
                                            />
                                        </FormControl>
                                        <span className="text-sm text-slate-600">MAD</span>
                                    </div>
                                )}
                            />

                            <div className="h-px bg-slate-200" />

                            <div className="flex justify-between text-base font-semibold">
                                <span>TOTAL:</span>
                                <span>{total.toFixed(2)} MAD</span>
                            </div>

                            <FormField
                                control={form.control}
                                name="amountPaid"
                                render={({ field }) => (
                                    <div className="flex items-center gap-3">
                                        <FormLabel className="text-sm text-slate-600 min-w-[100px]">Montant payé:</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                className="h-9 flex-1"
                                                {...field}
                                            />
                                        </FormControl>
                                        <span className="text-sm text-slate-600">MAD</span>
                                    </div>
                                )}
                            />

                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Reste à payer:</span>
                                <span className={cn(
                                    "font-medium",
                                    remaining > 0 ? "text-red-600" : "text-green-600"
                                )}>{remaining.toFixed(2)} MAD</span>
                            </div>
                        </div>

                        {/* Note */}
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Note (Optionnel)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Notes complémentaires..." className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <BrandLoader size="xs" className="mr-2 inline-flex" />}
                                Créer la Commande
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
