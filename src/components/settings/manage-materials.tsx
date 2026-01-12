
'use client';

import * as React from 'react';
import type { Material } from '@/lib/types';
import { collection, query, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle, Database, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MaterialForm } from './material-form';
import { seedMaterials } from '@/lib/materials-seed';
import { ManageItem } from './manage-item';


export function ManageMaterials() {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const { user } = useFirebase();

  const matieresQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `stores/${user.uid}/matieres`), orderBy('name', 'asc')) : null),
    [firestore, user]
  );
  const { data: materials, isLoading, error, refetch } = useCollection<Material>(matieresQuery);

  const handleSeedDatabase = async () => {
    if (!firestore || !user) return;

    setIsSeeding(true);
    let addedCount = 0;
    try {
      const matieresRef = collection(firestore, `stores/${user.uid}/matieres`);
      const q = query(matieresRef);
      const querySnapshot = await getDocs(q);
      const existingMaterials = new Set(querySnapshot.docs.map(doc => doc.data().name.toLowerCase().trim()));

      const batch = writeBatch(firestore);
      const materialsToAdd = seedMaterials.filter(material => !existingMaterials.has(material.name.toLowerCase().trim()));

      if (materialsToAdd.length === 0) {
        toast({
          title: 'Base de données à jour',
          description: 'Aucune nouvelle matière à importer.',
        });
        setIsSeeding(false);
        return;
      }

      materialsToAdd.forEach(material => {
        const docRef = doc(matieresRef);
        batch.set(docRef, { name: material.name, type: material.type });
        addedCount++;
      });

      await batch.commit();

      toast({
        title: 'Importation réussie',
        description: `${addedCount} nouvelles matières ont été ajoutées.`,
      });
      refetch(); // Refetch the collection data
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de l\'importation',
        description: e.message || "Une erreur inattendue s'est produite.",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSuccess = () => {
    setIsAddDialogOpen(false);
    refetch();
  }

  const groupedMaterials = React.useMemo(() => {
    if (!materials) return {};
    return materials.reduce((acc, material) => {
      const type = material.type || 'Autre';
      if (!acc[type]) acc[type] = [];
      acc[type].push(material);
      return acc;
    }, {} as Record<string, Material[]>);
  }, [materials]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Gérer les Matières</CardTitle>
        <CardDescription>Ajoutez, modifiez ou supprimez des matières de votre système.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 min-h-[400px]">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-20" />)}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur de connexion</AlertTitle>
            <AlertDescription>
              Impossible de charger les matières depuis Firestore. Vérifiez vos règles de sécurité ou votre connexion.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <>
            {materials && materials.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p className="mb-2">Aucune matière trouvée.</p>
                <p>Commencez par importer la liste de matières prédéfinies.</p>
              </div>
            ) : (
              Object.keys(groupedMaterials).map(type => (
                <div key={type}>
                  <h2 className="text-xl font-headline font-semibold mb-4">{type} ({groupedMaterials[type].length})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {groupedMaterials[type].map((material) => (
                      <ManageItem key={material.id} item={material} collectionName="matieres" itemName="Matière" FormComponent={MaterialForm} onSuccess={refetch} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Dialog modal={false} open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" />Ajouter une Matière</Button>
          </DialogTrigger>
          <DialogContent
            onInteractOutside={(e) => {
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Ajouter une nouvelle matière</DialogTitle>
              <DialogDescription>Remplissez les détails pour créer une nouvelle matière.</DialogDescription>
            </DialogHeader>
            <MaterialForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={handleSeedDatabase} disabled={isSeeding}>
          {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          {isSeeding ? 'Import en cours...' : 'Importer les matières'}
        </Button>
      </CardFooter>
    </Card>
  );
}
