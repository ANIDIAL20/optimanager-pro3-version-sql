'use client';

import * as React from 'react';
import { createDevis, DevisItem } from '@/app/actions/devis-actions';
import { getClients } from '@/app/actions/clients-actions';
import { getProducts } from '@/app/actions/products-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, Search } from 'lucide-react';
import { ClientSelector } from '@/components/sales/client-selector';
import { Client, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { QuickClientDialog } from '@/components/sales/quick-client-dialog';

interface CreateDevisModalProps {
    children: React.ReactNode;
    onSuccess?: () => void;
}

export function CreateDevisModal({ children, onSuccess }: CreateDevisModalProps) {
    const { toast } = useToast();

    const [isOpen, setIsOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    // Data State
    const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
    const [items, setItems] = React.useState<DevisItem[]>([]);
    const [clients, setClients] = React.useState<Client[]>([]);
    const [products, setProducts] = React.useState<Product[]>([]);

    // Load data when modal opens
    React.useEffect(() => {
        if (!isOpen) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                const [clientsResult, productsResult] = await Promise.all([
                    getClients(),
                    getProducts()
                ]);
                
                if (clientsResult.success) {
                    setClients(clientsResult.clients as any);
                }
                if (productsResult.success) {
                    setProducts(productsResult.data as any);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isOpen]);

    // Reset Form
    const resetForm = () => {
        setSelectedClient(null);
        setItems([]);
    };

    // Row Management
    const addItem = () => {
        setItems([...items, {
            reference: '',
            designation: '',
            quantite: 1,
            prixUnitaire: 0,
            productId: ''
        }]);
    };

    const updateItem = (index: number, field: keyof DevisItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleProductSelect = (index: number, product: Product) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            productId: product.id,
            reference: product.reference || '',
            designation: product.nom || product.nomProduit || '',
            prixUnitaire: product.prixVente || 0,
            quantite: 1 // Default to 1
        };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Calculate Totals
    const totalHT = items.reduce((sum, item) => sum + (item.quantite * item.prixUnitaire), 0);
    const totalTTC = totalHT * 1.20;

    // Save
    const handleSave = async () => {
        if (!selectedClient) {
            toast({ title: 'Erreur', description: 'Veuillez sélectionner un client', variant: 'destructive' });
            return;
        }
        if (items.length === 0) {
            toast({ title: 'Erreur', description: 'Veuillez ajouter au moins un produit', variant: 'destructive' });
            return;
        }

        // Validate items
        for (const item of items) {
            if (!item.designation) {
                toast({ title: 'Erreur', description: 'La désignation est obligatoire pour tous les articles', variant: 'destructive' });
                return;
            }
        }

        setIsSaving(true);
        try {
            const result = await createDevis({
                clientId: selectedClient.id,
                clientName: selectedClient.fullName || selectedClient.name || (selectedClient.nom ? `${selectedClient.prenom} ${selectedClient.nom}` : 'Client'),
                clientPhone: selectedClient.phone || selectedClient.telephone1 || '',
                items,
                status: 'EN_ATTENTE',
            });

            if (result.success) {
                toast({ title: 'Succès', description: 'Devis créé avec succès' });
                setIsOpen(false);
                resetForm();
                onSuccess?.();
            } else {
                toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Erreur', description: 'Une erreur inconnue est survenue', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Nouveau Devis Professionnel</DialogTitle>
                    <DialogDescription>
                        Créez un devis détaillé pour vos clients.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">
                    {/* 1. Client Selection */}
                    <div className="space-y-2">
                        <Label>Client</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <ClientSelector
                                    clients={clients}
                                    selectedClient={selectedClient}
                                    onSelectClient={setSelectedClient}
                                />
                            </div>
                            <QuickClientDialog onClientCreated={setSelectedClient} />
                        </div>
                    </div>

                    {/* 2. Items Table with Product Search */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[40%]">Désignation / Produit</TableHead>
                                    <TableHead className="w-[20%]">Référence</TableHead>
                                    <TableHead className="w-[15%] text-right">Qté</TableHead>
                                    <TableHead className="w-[15%] text-right">Prix U.</TableHead>
                                    <TableHead className="w-[10%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <ProductSearchCombobox
                                                products={products}
                                                value={item.designation}
                                                onSelect={(p) => handleProductSelect(index, p)}
                                                onChange={(val) => updateItem(index, 'designation', val)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={item.reference}
                                                onChange={(e) => updateItem(index, 'reference', e.target.value)}
                                                className="h-8"
                                                placeholder="Réf."
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantite}
                                                onChange={(e) => updateItem(index, 'quantite', parseFloat(e.target.value) || 0)}
                                                className="h-8 text-right"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={item.prixUnitaire}
                                                onChange={(e) => updateItem(index, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                                className="h-8 text-right"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeItem(index)}
                                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Aucun article. Cliquez sur "Ajouter une ligne" pour commencer.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="bg-muted/30 p-2 flex justify-center border-t">
                            <Button variant="ghost" className="text-blue-600 gap-2" onClick={addItem}>
                                <Plus className="h-4 w-4" /> Ajouter une ligne
                            </Button>
                        </div>
                    </div>

                    {/* 3. Totals */}
                    <div className="flex justify-end pt-4 border-t">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total HT</span>
                                <span>{totalHT.toFixed(2)} DH</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">TVA (20%)</span>
                                <span>{(totalTTC - totalHT).toFixed(2)} DH</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                <span>Total TTC</span>
                                <span className="text-blue-600">{totalTTC.toFixed(2)} DH</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer le Devis
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Inner Component: Product Search Combobox
function ProductSearchCombobox({
    products,
    value,
    onSelect,
    onChange
}: {
    products: Product[];
    value: string;
    onSelect: (p: Product) => void;
    onChange: (val: string) => void;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState(value);

    // Sync internal search term with external value cleanly
    React.useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    const filteredProducts = React.useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return products.filter(p =>
            (p.nom || p.nomProduit || '').toLowerCase().includes(lower) ||
            (p.reference && p.reference.toLowerCase().includes(lower))
        ).slice(0, 10); // Limit to 10
    }, [products, searchTerm]);

    return (
        <div className="relative">
            <Input
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay for click to register
                placeholder="Rechercher produit..."
                className="h-8"
            />
            {isOpen && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border rounded-md shadow-lg max-h-48 overflow-auto">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex justify-between"
                            onMouseDown={() => { // onMouseDown fires before onBlur
                                onSelect(product);
                                setIsOpen(false);
                            }}
                        >
                            <span>{product.nom || product.nomProduit}</span>
                            <span className="text-muted-foreground text-xs">{product.prixVente} DH</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
