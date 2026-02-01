'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ManageItem } from './manage-item';
import type { Category } from '@/lib/types';
import { GenericItemForm } from '@/generic-item-form';
import { getSettings } from '@/app/actions/settings-actions';


export function ManageCategories() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchCategories = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('categories');
      setCategories(data as Category[]);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur de Connexion</AlertTitle>
        <AlertDescription>
          Impossible de charger les catégories. {error}
          <Button variant="outline" size="sm" onClick={fetchCategories} className="mt-2">
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
              <ManageItem key={item.id} item={item} collectionName="categories" itemName="Catégorie" FormComponent={GenericItemForm} onSuccess={fetchCategories} />
            ))}
            <DialogItemAdd collectionName="categories" itemName="Catégorie" FormComponent={GenericItemForm} onSuccess={fetchCategories} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const DialogItemAdd = ({ collectionName, itemName, FormComponent, onSuccess }: { collectionName: string, itemName: string, FormComponent: React.FC<any>, onSuccess: () => void }) => {
const [isOpen, setIsOpen] = React.useState(false);
  
  const handleSuccess = () => {
    setIsOpen(false);
    onSuccess();
  };

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
        onSuccess={handleSuccess}
      />
    </Card>
  );
}
