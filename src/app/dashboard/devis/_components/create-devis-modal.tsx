'use client';

import * as React from 'react';
import { createDevis, DevisItem } from '@/app/actions/devis-actions';
import { getClients } from '@/app/actions/clients-actions';
import { getProducts, getCategories } from '@/app/actions/products-actions';
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
import { Plus, Trash2, Loader2, Search, ShoppingCart, User, X, Box } from 'lucide-react';
import { ClientSelector } from '@/components/sales/client-selector';
import { Client, Product, Category } from '@/lib/types'; // Add Category type if needed
import { cn } from '@/lib/utils';
import { QuickClientDialog } from '@/components/sales/quick-client-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
    const [categories, setCategories] = React.useState<{ id: string, name: string }[]>([]);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

    // Load data when modal opens
    React.useEffect(() => {
        if (!isOpen) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                const [clientsResult, productsResult, categoriesResult] = await Promise.all([
                    getClients(),
                    getProducts(),
                    getCategories()
                ]);

                if (clientsResult.success) {
                    setClients(clientsResult.clients as any);
                }
                if (productsResult.success) {
                    setProducts(productsResult.data as any);
                }
                if (categoriesResult.success) {
                   setCategories(categoriesResult.data as any);
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
        setSearchQuery('');
        setSelectedCategory('all');
    };

    // --- Actions ---

    const addItem = (product: Product) => {
        // Check if item already exists
        const existingIndex = items.findIndex(i => i.productId === product.id);

        if (existingIndex > -1) {
            // Update quantity
            const newItems = [...items];
            newItems[existingIndex].quantite += 1;
            setItems(newItems);
        } else {
            // Add new item
            setItems([...items, {
                productId: product.id,
                reference: product.reference || '',
                designation: product.nomProduit || product.nom || 'Produit sans nom',
                marque: product.marque || undefined,
                modele: product.modele || undefined,
                couleur: product.couleur || undefined,
                quantite: 1,
                prixUnitaire: product.prixVente || 0
            }]);
        }
    };

    const updateItemQty = (index: number, delta: number) => {
        const newItems = [...items];
        const currentQty = newItems[index].quantite;
        const newQty = currentQty + delta;

        if (newQty <= 0) {
            removeItem(index);
        } else {
            newItems[index].quantite = newQty;
            setItems(newItems);
        }
    };




    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Calculate Totals
    const totalHT = items.reduce((sum, item) => sum + (item.quantite * item.prixUnitaire), 0);
    const totalTTC = totalHT * 1.20;

    // Filter Products
    const filteredProducts = products.filter(product => {
        const matchesSearch = (product.nomProduit || product.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (product.reference || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || 
                                (product.categorie === selectedCategory) ||
                                (product.category === selectedCategory); // Handle differing field names
        return matchesSearch && matchesCategory;
    });

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
            <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-row">
                
                {/* -------------------- LEFT PANEL: PRODUCT CATALOG (60%) -------------------- */}
                <div className="flex-1 flex flex-col bg-muted/10 h-full border-r relative">
                   {/* Header: Search & Categories */}
                   <div className="p-4 bg-background border-b space-y-4">
                        <div className="flex items-center gap-2">
                             <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher produit (nom, référence)..."
                                    className="pl-9 bg-muted/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                             </div>
                        </div>

                        {/* Categories Tabs */}
                        <ScrollArea className="w-full pb-2">
                            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                                <TabsList className="bg-transparent h-auto p-0 gap-2 flex-wrap justify-start">
                                    <TabsTrigger 
                                        value="all" 
                                        className="rounded-full border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-1.5 h-auto text-sm"
                                    >
                                        Tous
                                    </TabsTrigger>
                                    {categories.map(cat => (
                                        <TabsTrigger 
                                            key={cat.id} 
                                            value={cat.name}
                                            className="rounded-full border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-1.5 h-auto text-sm"
                                        >
                                            {cat.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </ScrollArea>
                   </div>
                   
                   {/* Product Grid */}
                   <ScrollArea className="flex-1 p-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-2">
                                <Box className="h-10 w-10 opacity-20" />
                                <p>Aucun produit trouvé</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredProducts.map((product) => (
                                    <div 
                                        key={product.id} 
                                        onClick={() => {
                                            if (product.quantiteStock > 0) {
                                                addItem(product);
                                            }
                                        }}
                                        className={cn(
                                            "group transition-transform duration-200",
                                            product.quantiteStock > 0 
                                                ? "cursor-pointer hover:scale-[1.02]" 
                                                : "opacity-50 cursor-not-allowed grayscale-[0.5]"
                                        )}
                                    >
                                        <Card className="h-full border-muted hover:border-primary/50 overflow-hidden shadow-sm hover:shadow-md">
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <Badge variant={product.quantiteStock > 0 ? "outline" : "destructive"} className={cn("text-[10px] px-1.5 py-0 h-5", product.quantiteStock > 0 ? "text-green-600 border-green-200 bg-green-50" : "")}>
                                                        {product.quantiteStock > 0 ? `${product.quantiteStock} en stock` : 'Rupture'}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground font-mono">{product.reference}</span>
                                                </div>
                                                
                                                <div className="h-10 flex items-center">
                                                     <h4 className="font-medium text-sm line-clamp-2 leading-tight" title={product.nomProduit || product.nom}>
                                                        {product.nomProduit || product.nom}
                                                    </h4>
                                                </div>
                                                
                                                <div className="pt-2 flex justify-between items-center border-t border-dashed">
                                                    <span className="font-bold text-primary">{product.prixVente} DH</span>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        disabled={product.quantiteStock <= 0}
                                                        className="h-6 w-6 rounded-full group-hover:bg-primary group-hover:text-primary-foreground disabled:opacity-50 disabled:bg-transparent"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        )}
                   </ScrollArea>
                </div>


                {/* -------------------- RIGHT PANEL: QUOTE DETAILS (40%) -------------------- */}
                <div className="w-[400px] lg:w-[450px] xl:w-[500px] flex flex-col bg-background h-full shadow-xl z-10">
                    <DialogHeader className="p-4 border-b bg-muted/5">
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Nouveau Devis
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                             Sélectionnez un client et ajoutez des produits.
                        </DialogDescription>
                    </DialogHeader>

                     {/* Client Selection */}
                    <div className="p-4 bg-muted/10 border-b space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</Label>
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
                         {selectedClient && (
                            <div className="mt-2 text-xs flex items-center gap-2 text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{selectedClient.telephone1 || 'Pas de téléphone'}</span>
                            </div>
                        )}
                    </div>

                    {/* Items List */}
                    <ScrollArea className="flex-1 bg-background p-0">
                         {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 p-8 opacity-50">
                                <ShoppingCart className="h-12 w-12" />
                                <div className="text-center">
                                    <p className="font-medium">Le devis est vide</p>
                                    <p className="text-sm">Cliquez sur les produits à gauche pour les ajouter.</p>
                                </div>
                            </div>
                         ) : (
                            <div className="divide-y">
                                {items.map((item, index) => (
                                    <div key={index} className="p-3 hover:bg-muted/10 transition-colors group relative">
                                        <div className="flex justify-between gap-3 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium truncate" title={item.designation}>{item.designation}</h4>
                                                <div className="text-[10px] text-muted-foreground font-mono">{item.reference}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium text-sm">{item.prixUnitaire * item.quantite} DH</div>
                                                <div className="text-[10px] text-muted-foreground">{item.prixUnitaire} DH/u</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                             <div className="flex items-center border rounded-md self-start">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-none rounded-l-md hover:bg-muted"
                                                    onClick={() => updateItemQty(index, -1)}
                                                >
                                                    -
                                                </Button>
                                                <div className="w-8 text-center text-sm font-medium">{item.quantite}</div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-none rounded-r-md hover:bg-muted"
                                                    onClick={() => updateItemQty(index, 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                    </ScrollArea>

                    {/* Footer Totals */}
                    <div className="mt-auto border-t bg-muted/5 p-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="space-y-1.5 text-sm">
                             <div className="flex justify-between text-muted-foreground">
                                <span>Total HT</span>
                                <span>{totalHT.toFixed(2)} DH</span>
                            </div>
                             <div className="flex justify-between text-muted-foreground">
                                <span>TVA (20%)</span>
                                <span>{(totalTTC - totalHT).toFixed(2)} DH</span>
                            </div>
                             <Separator className="my-2" />
                            <div className="flex justify-between items-end">
                                <span className="font-semibold text-lg">Net à payer</span>
                                <span className="font-bold text-2xl text-primary">{totalTTC.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">DH</span></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                             <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                                Annuler
                            </Button>
                             <Button onClick={handleSave} disabled={isSaving || items.length === 0} className="w-full">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Créer Devis
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Close Button Absolute */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 z-50 rounded-full bg-background/50 hover:bg-background shadow-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                >
                    <X className="h-4 w-4" />
                </Button>

            </DialogContent>
        </Dialog>
    );
}
