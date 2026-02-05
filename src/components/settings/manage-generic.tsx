'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ManageItem } from './manage-item';
import type { SettingsItem } from '@/lib/types';
import { GenericItemForm } from './generic-item-form';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getSettings, deleteSetting, createSetting } from '@/app/actions/settings-actions';

interface ManageGenericProps {
  collectionName: string;
  itemName: string;
  title: string;
  description: string;
  FormComponent?: React.FC<any>;
  seedData?: { name: string, [key: string]: any }[];
  seedButtonText?: string;
}

// Map collection names to setting types
const collectionToTypeMap: Record<string, string> = {
  'brands': 'brands',
  'categories': 'categories',
  'materials': 'materials',
  'colors': 'colors',
  'treatments': 'treatments',
  'mountingTypes': 'mountingTypes',
  'banks': 'banks',
  'insurances': 'insurances',
  'marques': 'brands',
  'matieres': 'materials',
  'couleurs': 'colors',
  'traitements': 'treatments',
  'typesMontage': 'mountingTypes',
  'banques': 'banks',
  'mutuelles': 'insurances',
};

export function ManageGeneric({
  collectionName,
  itemName,
  title,
  description,
  FormComponent = GenericItemForm,
  seedData,
  seedButtonText
}: ManageGenericProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<SettingsItem | null>(null);
  const [items, setItems] = React.useState<SettingsItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Map collection name to setting type
  const settingType = collectionToTypeMap[collectionName] || collectionName;

  // Fetch items
  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings(settingType as any);
      setItems(data as SettingsItem[]);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [settingType]);

  // Initial load
  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSuccess = () => {
    setIsAddDialogOpen(false);
    fetchItems();
  }

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const itemId = typeof itemToDelete.id === 'string' ? parseInt(itemToDelete.id) : itemToDelete.id;
      await deleteSetting(settingType as any, itemId);
      toast({
        title: `${itemName} supprimé(e)`,
        description: `L'élément "${itemToDelete.name}" a été supprimé.`,
      });
      setItemToDelete(null);
      fetchItems();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer cet élément.',
      });
    }
  };

  const handleSeedDatabase = async () => {
    if (!seedData) return;

    setIsSeeding(true);
    let addedCount = 0;
    try {
      // Fetch existing items
      const existingItems = new Set(items.map(item => item.name.toLowerCase().trim()));

      // Filter items to add
      const itemsToAdd = seedData.filter(item => !existingItems.has(item.name.toLowerCase().trim()));

      if (itemsToAdd.length === 0) {
        toast({
          title: 'Base de données à jour',
          description: `Aucun nouvel élément à importer pour ${itemName}. ${items.length} éléments existaient déjà.`,
        });
        setIsSeeding(false);
        return;
      }

      // Add new items
      for (const item of itemsToAdd) {
        await createSetting(settingType as any, item);
        addedCount++;
      }

      toast({
        title: 'Importation réussie',
        description: `${addedCount} nouveaux éléments ont été ajoutés. ${items.length} éléments existaient déjà. Total : ${items.length + addedCount}`,
      });
      fetchItems();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de l\'importation',
        description: e.message || "Une erreur inattendue s'est produite.",
      });
    } finally {
      setIsSeeding(false);
    }
  }


  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur de Connexion</AlertTitle>
        <AlertDescription>
          Impossible de charger les données pour "{itemName}". {error}
          <Button variant="outline" size="sm" onClick={fetchItems} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[200px]">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <>
            {items && items.length === 0 && seedData && (
              <div className="text-center text-muted-foreground py-12">
                <p className="mb-2">Aucun élément trouvé pour "{itemName}".</p>
                <p>Commencez par importer la liste de données prédéfinies.</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items?.map(item => (
                <ManageItem 
                  key={item.id} 
                  item={item} 
                  collectionName={collectionName} 
                  itemName={itemName} 
                  FormComponent={FormComponent} 
                  onSuccess={fetchItems}
                  onDeleteClick={setItemToDelete}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter: {itemName}</DialogTitle>
            </DialogHeader>
            <FormComponent collectionName={collectionName} itemName={itemName} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
        {seedData && (
          <Button variant="outline" onClick={handleSeedDatabase} disabled={isSeeding}>
            {isSeeding ? <BrandLoader size="xs" className="mr-2 inline-flex" /> : <Database className="mr-2 h-4 w-4" />}
            {isSeeding ? 'Import en cours...' : (seedButtonText || 'Importer les données')}
          </Button>
        )}
      </CardFooter>

      {/* Single Shared Delete Dialog - Outside the loop */}
      {/* @ts-ignore - modal prop exists but not in types */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'élément "{itemToDelete?.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
