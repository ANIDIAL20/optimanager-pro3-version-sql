'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Download } from 'lucide-react';
import {
  getSettings,
  createSetting,
  updateSetting,
  deleteSetting,
} from '@/app/actions/settings-actions';
import {
  seedCategories,
  seedBrands,
  seedColors,
  seedMaterials,
  seedTreatments,
  seedInsurances,
  seedMountingTypes,
  seedBanks,
} from '@/app/actions/seed-settings-actions';

type SettingType =
  | 'brands'
  | 'categories'
  | 'materials'
  | 'colors'
  | 'treatments'
  | 'mountingTypes'
  | 'banks'
  | 'insurances';

interface SettingItem {
  id: number;
  name: string;
  category?: string | null;
  userId: string;
}

interface ManageSettingsProps {
  type: SettingType;
  title: string;
  description: string;
  itemName: string; // e.g., "Marque", "Catégorie"
  showCategory?: boolean; // Only for brands
  showSeedButton?: boolean; // Show import button
}

export function ManageSettings({
  type,
  title,
  description,
  itemName,
  showCategory = false,
  showSeedButton = true,
}: ManageSettingsProps) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SettingItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<SettingItem | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('');

  // Load items
  const loadItems = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getSettings(type);
      setItems(data as SettingItem[]);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error?.message || 'Impossible de charger les données.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [type, toast]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Seed default data
  const handleSeed = async () => {
    setIsSeeding(true);

    try {
      let result;

      switch (type) {
        case 'categories':
          result = await seedCategories();
          break;
        case 'brands':
          result = await seedBrands();
          break;
        case 'colors':
          result = await seedColors();
          break;
        case 'materials':
          result = await seedMaterials();
          break;
        case 'treatments':
          result = await seedTreatments();
          break;
        case 'insurances':
          result = await seedInsurances();
          break;
        case 'mountingTypes':
          result = await seedMountingTypes();
          break;
        case 'banks':
          result = await seedBanks();
          break;
        default:
          throw new Error('Type non supporté pour l\'import');
      }

      toast({
        title: result.message,
        description: result.count > 0 ? `${result.count} ${itemName.toLowerCase()}s importé${result.count > 1 ? 's' : ''}.` : undefined,
      });

      if (result.count > 0) {
        loadItems();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'import',
        description: error?.message || 'Impossible d\'importer les données.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Open create dialog
  const handleCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('');
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (item: SettingItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || '');
    setIsDialogOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!formName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le nom est requis.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const data: any = {
        name: formName.trim(),
      };

      if (showCategory) {
        data.category = formCategory.trim() || undefined;
      }

      if (editingItem) {
        // Update
        await updateSetting(type, editingItem.id, data);
        toast({
          title: `${itemName} modifié${itemName.endsWith('e') ? 'e' : ''}`,
          description: `"${formName}" a été mis${itemName.endsWith('e') ? 'e' : ''} à jour.`,
        });
      } else {
        // Create
        await createSetting(type, data);
        toast({
          title: `${itemName} ajouté${itemName.endsWith('e') ? 'e' : ''}`,
          description: `"${formName}" a été créé${itemName.endsWith('e') ? 'e' : ''}.`,
        });
      }

      setIsDialogOpen(false);
      loadItems();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error?.message || "Une erreur s'est produite.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Open delete confirmation
  const handleDeleteConfirm = (item: SettingItem) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Delete item
  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      await deleteSetting(type, deletingItem.id);
      toast({
        title: `${itemName} supprimé${itemName.endsWith('e') ? 'e' : ''}`,
        description: `"${deletingItem.name}" a été supprimé${itemName.endsWith('e') ? 'e' : ''}.`,
      });
      setIsDeleteDialogOpen(false);
      loadItems();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer.',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex gap-2">
              {showSeedButton && items.length === 0 && (
                <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Importer
                </Button>
              )}
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>Aucun{itemName.endsWith('e') ? 'e' : ''} {itemName.toLowerCase()} pour le moment.</p>
              <p className="text-sm mt-2">
                Cliquez sur "Ajouter" pour commencer.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:border-slate-300 transition-colors"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {showCategory && item.category && (
                      <p className="text-sm text-slate-500">{item.category}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteConfirm(item)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={false}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier' : 'Ajouter'} {itemName}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? `Modifiez les détails de ${itemName.toLowerCase()}.`
                : `Ajoutez un${itemName.endsWith('e') ? 'e' : ''} nouveau${itemName.endsWith('e') ? 'lle' : ''} ${itemName.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={`e.g., ${itemName === 'Marque' ? 'Ray-Ban' : itemName === 'Couleur' ? 'Noir' : 'Exemple'}`}
                autoFocus
              />
            </div>
            {showCategory && (
              <div>
                <Label htmlFor="category">Catégorie (optionnel)</Label>
                <Input
                  id="category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g., Premium, Populaire"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onInteractOutside={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deletingItem?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
