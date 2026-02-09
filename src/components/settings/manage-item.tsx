
'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  onDeleteClick?: (item: Item) => void;
}

const ItemCard: React.FC<ManageItemProps> = ({ item, collectionName, itemName, FormComponent, onSuccess, onDeleteClick }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const handleSuccess = () => {
    setIsEditDialogOpen(false);
    onSuccess();
  }

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
        
        {/* Action Buttons Container */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
          {/* Delete Button - Standalone to avoid dropdown race condition */}
          {onDeleteClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDeleteClick(item)}
            >
              <Trash2 size={18} />
            </Button>
          )}

          {/* Edit Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                Modifier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
