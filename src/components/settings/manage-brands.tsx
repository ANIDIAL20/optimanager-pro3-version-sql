
'use client';

import * as React from 'react';
import type { Brand, BrandCategory } from '@/lib/types';
import {
  collection,
  doc,
  query,
  orderBy,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useFirebase
} from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  AlertCircle,
  Database,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BrandForm } from './brand-form';
import { seedBrands } from '@/lib/brands-seed';
import { ManageItem } from './manage-item';


export function ManageBrands() {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const { user } = useFirebase();

  const marquesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `stores/${user.uid}/marques`), orderBy('name', 'asc')) : null),
    [firestore, user]
  );
  const { data: brands, isLoading, error, refetch } = useCollection<Brand>(marquesQuery);

  const handleSeedDatabase = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de se connecter à la base de données ou utilisateur non identifié.',
      });
      return;
    }

    setIsSeeding(true);
    let addedCount = 0;

    try {
      const marquesRef = collection(firestore, `stores/${user.uid}/marques`);
      const q = query(marquesRef);
      const querySnapshot = await getDocs(q);
      const existingBrands = new Set(querySnapshot.docs.map(doc => doc.data().name.toLowerCase().trim()));

      const batch = writeBatch(firestore);
      const brandsToAdd = seedBrands.filter(brand => !existingBrands.has(brand.name.toLowerCase().trim()));

      if (brandsToAdd.length === 0) {
        toast({
          title: 'Base de données à jour',
          description: 'Aucune nouvelle marque à importer.',
        });
        setIsSeeding(false);
        return;
      }

      brandsToAdd.forEach(brand => {
        const docRef = doc(marquesRef);
        batch.set(docRef, { name: brand.name, category: brand.category });
        addedCount++;
      });

      await batch.commit();

      toast({
        title: 'Importation réussie',
        description: `${addedCount} nouvelles marques ont été ajoutées.`,
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
  };

  const handleSuccess = () => {
    setIsAddDialogOpen(false);
    refetch();
  }

  const groupedBrands = React.useMemo(() => {
    if (!brands) return {};
    return brands.reduce((acc, brand) => {
      const category = brand.category || 'Autre';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(brand);
      return acc;
    }, {} as Record<string, Brand[]>);
  }, [brands]);

  const categoryOrder: BrandCategory[] = ['Premium', 'Populaire', 'Française', 'Autre'];

  const sortedCategories = Object.keys(groupedBrands).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a as BrandCategory);
    const indexB = categoryOrder.indexOf(b as BrandCategory);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Gérer les Marques</CardTitle>
        <CardDescription>
          Ajoutez, modifiez ou supprimez des marques de votre système.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 min-h-[400px]">
        {isLoading && (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-1/4 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-20" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur de connexion</AlertTitle>
            <AlertDescription>
              Impossible de charger les marques depuis Firestore. Vérifiez vos
              règles de sécurité ou votre connexion.
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && (
          <>
            {brands && brands.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <p className="mb-2">Aucune marque trouvée.</p>
                <p>
                  Commencez par importer la liste de marques prédéfinies.
                </p>
              </div>
            )}

            {sortedCategories.map((category) => (
              <div key={category}>
                <h2 className="text-xl font-headline font-semibold mb-4">
                  {category} ({groupedBrands[category].length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {groupedBrands[category].map((brand) => (
                    <ManageItem key={brand.id} item={brand} collectionName="marques" itemName="Marque" FormComponent={BrandForm} onSuccess={refetch} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter une Marque
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une nouvelle marque</DialogTitle>
              <DialogDescription>
                Remplissez les détails pour créer une nouvelle marque.
              </DialogDescription>
            </DialogHeader>
            <BrandForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={handleSeedDatabase} disabled={isSeeding}>
          {isSeeding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          {isSeeding ? 'Import en cours...' : 'Importer les marques'}
        </Button>
      </CardFooter>
    </Card>
  );
}
