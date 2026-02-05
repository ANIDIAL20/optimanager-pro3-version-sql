"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Package } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Server Actions
import { receiveLensOrder } from '@/app/actions/lens-orders-actions';
import { getSuppliersList } from '@/app/actions/supplier-actions';

// Schema
const formSchema = z.object({
    supplierId: z.string().min(1, "Veuillez sélectionner un fournisseur"),
    supplierInvoiceRef: z.string().min(1, "Référence BL requise"),
    buyingPrice: z.coerce.number().min(0.01, "Prix d'achat requis"),
    receivedAt: z.date({
        required_error: "Date de réception requise",
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface ReceiveLensModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleId: string;
}

export function ReceiveLensModal({ open, onOpenChange, saleId }: ReceiveLensModalProps) {
    const [suppliers, setSuppliers] = React.useState<{ id: string; nomCommercial: string }[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            supplierId: '',
            supplierInvoiceRef: '',
            buyingPrice: 0,
            receivedAt: new Date(),
        },
    });

    // Fetch Suppliers using Server Action
    React.useEffect(() => {
        if (!open) return;

        const loadSuppliers = async () => {
            setIsLoadingSuppliers(true);
            try {
                const result = await getSuppliersList();
                if (result.success && result.data) {
                    const list = result.data.map(supplier => ({
                        id: supplier.id!.toString(),
                        nomCommercial: supplier.nomCommercial || 'Sans Nom',
                    }));
                    setSuppliers(list);
                } else {
                    toast({
                        title: "Erreur",
                        description: "Impossible de charger les fournisseurs",
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

            const result = await receiveLensOrder(saleId, {
                supplierId: values.supplierId,
                supplierName: supplierName,
                buyingPrice: values.buyingPrice,
                supplierInvoiceRef: values.supplierInvoiceRef,
                receivedAt: values.receivedAt,
            });

            if (result.success) {
                toast({
                    title: "Succès",
                    description: "Commande réceptionnée avec succès",
                });
                onOpenChange(false);
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
                description: "Erreur lors de la réception",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Réception Commande Verres
                    </DialogTitle>
                    <DialogDescription>
                        Saisissez les détails du Bon de Livraison (BL) fournisseur.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Supplier Select */}
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fournisseur</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isLoadingSuppliers ? "Chargement..." : "Sélectionner le fournisseur"} />
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

                        {/* Invoice Reference */}
                        <FormField
                            control={form.control}
                            name="supplierInvoiceRef"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Référence BL / Facture</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: BL-2024-001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Buying Price */}
                            <FormField
                                control={form.control}
                                name="buyingPrice"
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

                            {/* Reception Date */}
                            <FormField
                                control={form.control}
                                name="receivedAt"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date Réception</FormLabel>
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
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <BrandLoader size="xs" className="mr-2 inline-flex" />}
                                Confirmer Réception
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
