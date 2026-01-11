'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
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
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { Client, Product, Sale, OrderDetail } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Invoice } from './invoice';

const SaleItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  quantity: z.coerce.number().min(1, 'La quantité doit être au moins 1'),
  price: z.number(),
  stock: z.number(),
});

const SaleFormSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'Veuillez ajouter au moins un produit.'),
  totalPaye: z.coerce.number().min(0),
  methode: z.enum(['Especes', 'Carte', 'Cheque', 'Virement']),
  notes: z.string().optional(),
});

type SaleFormValues = z.infer<typeof SaleFormSchema>;

interface SaleWithDetails extends Sale {
  details: OrderDetail[];
}

interface SaleFormProps {
  client: Client;
}

export function SaleForm({ client }: SaleFormProps) {
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(SaleFormSchema),
    defaultValues: {
      items: [],
      totalPaye: 0,
      methode: 'Especes',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const firestore = useFirestore();
  const { user } = useFirebase();
  const { toast } = useToast();

  const productsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `stores/${user.uid}/products`) : null),
    [firestore, user]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const [openProductSearch, setOpenProductSearch] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [lastSale, setLastSale] = React.useState<SaleWithDetails | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = React.useState(false);

  const watchItems = form.watch('items');
  const totalNet = React.useMemo(
    () => watchItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [watchItems]
  );
  const watchTotalPaye = form.watch('totalPaye');
  const resteAPayer = totalNet - watchTotalPaye;

  const handleAddProduct = () => {
    if (selectedProduct) {
      const existingItem = fields.find(item => item.productId === selectedProduct.id);
      if (existingItem) {
        toast({
          variant: 'destructive',
          title: 'Produit déjà ajouté',
          description: 'Ce produit est déjà dans la liste de vente.',
        });
        return;
      }
      if (selectedProduct.quantiteStock < 1) {
        toast({
          variant: 'destructive',
          title: 'Stock insuffisant',
          description: `Le produit "${selectedProduct.nomProduit}" est en rupture de stock.`,
        });
        return;
      }

      append({
        productId: selectedProduct.id,
        productName: selectedProduct.nomProduit,
        quantity: 1,
        price: selectedProduct.prixVente,
        stock: selectedProduct.quantiteStock,
      });
      setSelectedProduct(null);
    }
  };

  const onSubmit = async (data: SaleFormValues) => {
    if (!firestore || !user) return;

    try {
      const batch = writeBatch(firestore);

      const saleRef = doc(collection(firestore, `stores/${user.uid}/sales`));
      const saleData: Omit<Sale, 'id'> = {
        clientId: client.id,
        date: new Date().toISOString(),
        totalNet,
        totalPaye: data.totalPaye,
        resteAPayer,
        notes: data.notes,
      };
      batch.set(saleRef, saleData);

      const saleDetails: OrderDetail[] = [];
      for (const item of data.items) {
        const orderDetailRef = doc(collection(firestore, `stores/${user.uid}/sales/${saleRef.id}/orderDetails`));
        const detail: Omit<OrderDetail, 'id'> = {
          orderId: saleRef.id,
          produitId: item.productId,
          nom: item.productName,
          prix: item.price,
          quantite: item.quantity,
        };
        batch.set(orderDetailRef, detail);
        saleDetails.push({ ...detail, id: orderDetailRef.id });

        const stockMovementRef = doc(collection(firestore, `stores/${user.uid}/stockMovements`));
        batch.set(stockMovementRef, {
          produitId: item.productId,
          quantite: -item.quantity,
          type: 'Vente',
          ref: saleRef.id,
        });

        const productRef = doc(firestore, `stores/${user.uid}/products`, item.productId);
        batch.update(productRef, {
          quantiteStock: item.stock - item.quantity
        });
      }

      if (data.totalPaye > 0) {
        const paymentRef = doc(collection(firestore, `stores/${user.uid}/sales/${saleRef.id}/payments`));
        batch.set(paymentRef, {
          saleId: saleRef.id,
          montant: data.totalPaye,
          methode: data.methode,
          date: new Date().toISOString(),
        });
      }

      await batch.commit();

      setLastSale({ ...saleData, id: saleRef.id, details: saleDetails });
      setIsInvoiceOpen(true);
      form.reset();

    } catch (error) {
      console.error("Sale creation error:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur est survenue lors de l'enregistrement de la vente.",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle Vente</CardTitle>
          <CardDescription>Enregistrer une nouvelle vente pour {client.prenom} {client.nom}.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div>
                <Label>Ajouter des produits</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Popover open={openProductSearch} onOpenChange={setOpenProductSearch}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openProductSearch}
                        className="w-[300px] justify-between"
                        disabled={isLoadingProducts}
                      >
                        {selectedProduct ? selectedProduct.nomProduit : "Rechercher un produit..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Rechercher un produit..." />
                        <CommandList>
                          <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                          <CommandGroup>
                            {products?.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.nomProduit}
                                onSelect={() => {
                                  setSelectedProduct(product);
                                  setOpenProductSearch(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedProduct?.id === product.id ? "opacity-100" : "opacity-0")} />
                                {product.nomProduit} ({product.quantiteStock} en stock)
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button type="button" onClick={handleAddProduct} disabled={!selectedProduct}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                  </Button>
                </div>
              </div>

              {fields.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-[100px]">Quantité</TableHead>
                      <TableHead className="w-[120px] text-right">Prix Unitaire</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                className="text-center"
                                min={1}
                                max={item.stock}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right">{item.price.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-right">{(item.price * watchItems[index].quantity).toFixed(2)} MAD</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <FormField
                control={form.control}
                name="items"
                render={({ fieldState }) => <FormMessage>{fieldState.error?.message}</FormMessage>}
              />
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                <div className='lg:col-start-3'>
                  <Label>Paiement</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <FormField
                      control={form.control}
                      name="totalPaye"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant Payé</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="methode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Méthode</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Especes">Espèces</SelectItem>
                              <SelectItem value="Carte">Carte</SelectItem>
                              <SelectItem value="Cheque">Chèque</SelectItem>
                              <SelectItem value="Virement">Virement</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2 rounded-md bg-muted p-4">
                  <div className="flex justify-between font-medium">
                    <span>Total Net:</span>
                    <span>{totalNet.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>Payé:</span>
                    <span>{watchTotalPaye.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-destructive">
                    <span>Reste à Payer:</span>
                    <span>{resteAPayer.toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes sur la vente</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ajouter des commentaires..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting || fields.length === 0}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer la Vente
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vente enregistrée - Facture #{lastSale?.id.slice(0, 6)}</DialogTitle>
          </DialogHeader>
          {lastSale && client && <Invoice sale={lastSale} client={client} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
