'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, doc, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, Database } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ManageItem } from './manage-item';
import type { SettingsItem } from '@/lib/types';
import { GenericItemForm } from './generic-item-form';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { deleteDocumentNonBlocking } from '@/firebase';

interface ManageGenericProps {
  collectionName: string;
  itemName: string;
  title: string;
  description: string;
  FormComponent?: React.FC<any>;
  seedData?: { name: string, [key: string]: any }[];
  seedButtonText?: string;
}

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
  const firestore = useFirestore();
  const { toast } = useToast();

  const { user } = useFirebase();

  const itemsQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, `stores/${user.uid}/${collectionName}`), orderBy('name', 'asc')) : null,
    [firestore, collectionName, user]
  );

  const { data: items, isLoading, error, refetch } = useCollection<SettingsItem>(itemsQuery);

  const handleSuccess = () => {
    setIsAddDialogOpen(false);
    refetch();
  }

  const handleDelete = () => {
    if (!firestore || !user || !itemToDelete) return;
    const docRef = doc(firestore, `stores/${user.uid}/${collectionName}`, itemToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: `${itemName} supprimé(e)`,
      description: `L'élément "${itemToDelete.name}" a été supprimé.`,
    });
    setItemToDelete(null);
    refetch();
  };

  const handleSeedDatabase = async () => {
    if (!firestore || !seedData || !user) return;

    setIsSeeding(true);
    let addedCount = 0;
    try {
      const ref = collection(firestore, `stores/${user.uid}/${collectionName}`);
      const q = query(ref);
      const querySnapshot = await getDocs(q);
      const existingItems = new Set(querySnapshot.docs.map(doc => doc.data().name.toLowerCase().trim()));

      const batch = writeBatch(firestore);
      const itemsToAdd = seedData.filter(item => !existingItems.has(item.name.toLowerCase().trim()));

      if (itemsToAdd.length === 0) {
        toast({
          title: 'Base de données à jour',
          description: `Aucun nouvel élément à importer pour ${itemName}. ${querySnapshot.size} éléments existaient déjà.`,
        });
        setIsSeeding(false);
        return;
      }

      itemsToAdd.forEach(item => {
        const docRef = doc(ref);
        batch.set(docRef, item);
        addedCount++;
      });

      await batch.commit();

      toast({
        title: 'Importation réussie',
        description: `${addedCount} nouveaux éléments ont été ajoutés. ${querySnapshot.size} éléments existaient déjà. Total : ${querySnapshot.size + addedCount}`,
      });
      refetch();
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
          Impossible de charger les données pour "{itemName}".
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
                  onSuccess={refetch}
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
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
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
