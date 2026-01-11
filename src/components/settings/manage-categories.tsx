
'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ManageItem } from './manage-item';
import type { Category } from '@/lib/types';
import { GenericItemForm } from './generic-item-form';


export function ManageCategories() {
  const { user } = useFirebase();
  const firestore = useFirestore();

  const categoriesQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, `stores/${user.uid}/categories`) : null,
    [firestore, user]
  );

  const { data: categories, isLoading, error } = useCollection<Category>(categoriesQuery);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur de Connexion</AlertTitle>
        <AlertDescription>
          Impossible de charger les catégories.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Gérer les Catégories</CardTitle>
        <CardDescription>
          Ajoutez, modifiez ou supprimez des catégories de produits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories?.map(item => (
              <ManageItem key={item.id} item={item} collectionName="categories" itemName="Catégorie" FormComponent={GenericItemForm} onSuccess={() => { }} />
            ))}
            <DialogItemAdd collectionName="categories" itemName="Catégorie" FormComponent={GenericItemForm} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const DialogItemAdd = ({ collectionName, itemName, FormComponent }: { collectionName: string, itemName: string, FormComponent: React.FC<any> }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Card className="border-dashed border-2 hover:border-primary transition-colors hover:text-primary flex items-center justify-center">
      <button onClick={() => setIsOpen(true)} className="w-full h-full text-sm font-semibold text-muted-foreground hover:text-primary">
        <PlusCircle className="mx-auto mb-1 h-5 w-5" />
        Ajouter une {itemName}
      </button>
      <ManageItem.Dialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        collectionName={collectionName}
        itemName={itemName}
        FormComponent={FormComponent}
        onSuccess={() => { }}
      />
    </Card>
  );
}
