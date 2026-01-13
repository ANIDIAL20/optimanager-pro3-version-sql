
'use client';

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, deleteDocumentNonBlocking, useFirebase } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface Item {
  id: string;
  name: string;
  [key: string]: any;
}

interface ManageItemProps {
  item: Item;
  collectionName: string;
  itemName: string;
  onSuccess: () => void;
  FormComponent?: React.FC<any>;
}

const ItemCard: React.FC<ManageItemProps> = ({ item, collectionName, itemName, FormComponent, onSuccess }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const { user } = useFirebase();

  const handleSuccess = () => {
    setIsEditDialogOpen(false);
    onSuccess();
  }

  const handleDelete = () => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `stores/${user.uid}/${collectionName}`, item.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: `${itemName} supprimé(e)`,
      description: `L'élément "${item.name}" a été supprimé.`,
    });
    setShowDeleteDialog(false);
    onSuccess();
  };

  const FormDialog = FormComponent ? (
    <FormComponent item={item} onSuccess={handleSuccess} />
  ) : null;

  return (
    <>
      <Card className="group relative flex flex-col justify-center items-center p-4 text-center transition-all hover:shadow-lg hover:-translate-y-1">
        {item.hexCode && <div className="w-4 h-4 rounded-full border mb-2" style={{ backgroundColor: item.hexCode }}></div>}
        <p className="font-semibold">{item.name}</p>

        {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
        {item.type && <p className="text-xs text-muted-foreground">{item.type}</p>}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive" 
              onSelect={() => setShowDeleteDialog(true)}
            >
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>

      {/* Edit Dialog */}
      <Dialog modal={false} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Modifier: {item.name}</DialogTitle>
            <DialogDescription>Mettez à jour les informations.</DialogDescription>
          </DialogHeader>
          {FormDialog}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog - Separated from DropdownMenu */}
      {/* @ts-ignore - modal prop exists but not in types */}
      <AlertDialog modal={false} open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'élément "{item.name}" sera définitivement supprimé.
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
    </>
  );
};


interface DialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item?: Item;
  collectionName: string;
  itemName: string;
  onSuccess: () => void;
  FormComponent?: React.FC<any>;
}

const ItemDialog: React.FC<DialogProps> = ({ isOpen, onOpenChange, item, collectionName, itemName, FormComponent, onSuccess }) => {

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  }

  const Form = FormComponent
    ? <FormComponent item={item} onSuccess={handleSuccess} />
    : null;

  return (
    <Dialog modal={false} open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{item ? `Modifier: ${item.name}` : `Ajouter une ${itemName}`}</DialogTitle>
          <DialogDescription>
            {item ? "Mettez à jour les informations." : "Remplissez le nom pour créer un nouvel élément."}
          </DialogDescription>
        </DialogHeader>
        {Form}
      </DialogContent>
    </Dialog>
  )
}

(ItemCard as any).Dialog = ItemDialog;

export const ManageItem = ItemCard as React.FC<ManageItemProps> & { Dialog: typeof ItemDialog };
