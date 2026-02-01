'use client';

import * as React from 'react';
import type { Brand, BrandCategory } from '@/lib/types';
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
  RefreshCw,
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
import { getSettings, createSetting } from '@/app/actions/settings-actions';


export function ManageBrands() {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Fetch brands
  const fetchBrands = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('brands');
      setBrands(data as Brand[]);
    } catch (err: any) {
      console.error('Error fetching brands:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    let addedCount = 0;

    try {
      // Get existing brands
      const existingBrands = new Set(brands.map(brand => brand.name.toLowerCase().trim()));

      // Filter brands to add
      const brandsToAdd = seedBrands.filter(brand => !existingBrands.has(brand.name.toLowerCase().trim()));

      if (brandsToAdd.length === 0) {
        toast({
          title: 'Base de données à jour',
          description: 'Aucune nouvelle marque à importer.',
        });
        setIsSeeding(false);
        return;
      }

      // Add new brands
      for (const brand of brandsToAdd) {
        await createSetting('brands', { name: brand.name, category: brand.category });
        addedCount++;
      }

      toast({
        title: 'Importation réussie',
        description: `${addedCount} nouvelles marques ont été ajoutées.`,
      });
      fetchBrands();
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
    fetchBrands();
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Gérer les Marques</CardTitle>
          <CardDescription>
            Ajoutez, modifiez ou supprimez des marques de votre système.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur de connexion</AlertTitle>
            <AlertDescription>
              Impossible de charger les marques. {error}
              <Button variant="outline" size="sm" onClick={fetchBrands} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

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

        {!isLoading && (
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
                    <ManageItem key={brand.id} item={brand} collectionName="marques" itemName="Marque" FormComponent={BrandForm} onSuccess={fetchBrands} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Dialog modal={false} open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter une Marque
            </Button>
          </DialogTrigger>
          <DialogContent
            onInteractOutside={(e) => {
              e.preventDefault();
            }}
          >
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
