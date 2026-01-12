'use client';

import * as React from 'react';
import { getClientLensOrders, updateLensOrder, deleteLensOrder } from '@/app/actions/lens-orders-actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, MoreHorizontal, Loader2, Eye, Trash2, Edit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface LensOrderListProps {
  clientId: string;
  clientName?: string;
}

type LensOrderStatus = 'pending' | 'ordered' | 'received' | 'delivered';

interface LensOrder {
  id: number;
  lensType: string;
  supplierName: string;
  orderType: string;
  treatment: string | null;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  status: string;
  orderDate: Date | null;
  receivedDate: Date | null;
  deliveredDate: Date | null;
  notes: string | null;
  rightEye: any;
  leftEye: any;
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { variant: any; label: string; className?: string }> = {
    pending: { variant: 'outline', label: 'En Attente', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    ordered: { variant: 'default', label: 'Commandée', className: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' },
    received: { variant: 'secondary', label: 'Reçue', className: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' },
    delivered: { variant: 'default', label: 'Livrée', className: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' }
  };

  const config = statusMap[status] || { variant: 'outline', label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

export function LensOrderList({ clientId, clientName }: LensOrderListProps) {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<LensOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<LensOrder | null>(null);
  const [newStatus, setNewStatus] = React.useState<LensOrderStatus>('pending');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  // Load orders
  const loadOrders = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getClientLensOrders(clientId);

      if (result.success && result.data) {
        setOrders(result.data as LensOrder[]);
      } else {
        setError(result.error || 'Erreur de chargement');
      }
    } catch (err) {
      setError('Erreur de chargement des commandes');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Open update dialog
  const handleOpenUpdateDialog = (order: LensOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status as LensOrderStatus);
    setIsUpdateDialogOpen(true);
  };

  // Open view details
  const handleOpenViewDetails = (order: LensOrder) => {
    setSelectedOrder(order);
    setIsViewDetailsOpen(true);
  };

  // Update status
  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      const result = await updateLensOrder(selectedOrder.id.toString(), { status: newStatus });

      if (result.success) {
        toast({ title: 'Succès', description: 'Statut mis à jour' });
        setIsUpdateDialogOpen(false);
        loadOrders();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de la mise à jour', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete order
  const handleDelete = async (orderId: number) => {
    if (!confirm('Supprimer cette commande ?')) return;

    setDeletingId(orderId);
    try {
      const result = await deleteLensOrder(orderId.toString());

      if (result.success) {
        toast({ title: 'Succès', description: 'Commande supprimée' });
        loadOrders();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historique des Commandes de Verres</CardTitle>
          <CardDescription>
            Liste de toutes les commandes de verres pour ce client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && orders && orders.length === 0 && (
            <div className="text-center text-muted-foreground py-6">
              Aucune commande de verres trouvée pour ce client.
            </div>
          )}
          {!isLoading && orders && orders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type Verre</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Prix Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {order.orderDate ? format(new Date(order.orderDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{order.lensType}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {order.totalPrice} MAD
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenViewDetails(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenUpdateDialog(order)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier le statut
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(order.id)}
                            disabled={deletingId === order.id}
                            className="text-red-600 focus:text-red-600"
                          >
                            {deletingId === order.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog modal={false} open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent 
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Modifier le statut de la commande</DialogTitle>
            <DialogDescription>
              Mettez à jour le statut actuel pour la commande du{' '}
              {selectedOrder && selectedOrder.orderDate
                ? format(new Date(selectedOrder.orderDate), 'dd/MM/yyyy')
                : '-'}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* ✅ FIX: Add modal={false} to prevent Select overlay from blocking UI */}
            <Select
              value={newStatus}
              onValueChange={(val) => setNewStatus(val as LensOrderStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En Attente</SelectItem>
                <SelectItem value="ordered">Commandée</SelectItem>
                <SelectItem value="received">Reçue</SelectItem>
                <SelectItem value="delivered">Livrée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={isUpdating}>
              Annuler
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog modal={false} open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent 
          className="max-w-3xl"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Détails de la Commande</DialogTitle>
            <DialogDescription>
              Commande du{' '}
              {selectedOrder && selectedOrder.orderDate
                ? format(new Date(selectedOrder.orderDate), 'dd/MM/yyyy')
                : '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Type de Verre</p>
                  <p className="text-base font-semibold">{selectedOrder.lensType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Fournisseur</p>
                  <p className="text-base">{selectedOrder.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Type Commande</p>
                  <p className="text-base">{selectedOrder.orderType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Traitement</p>
                  <p className="text-base">{selectedOrder.treatment || 'Aucun'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Prix Unitaire</p>
                  <p className="text-lg font-semibold">{selectedOrder.unitPrice} MAD</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Quantité</p>
                  <p className="text-lg font-semibold">{selectedOrder.quantity}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-slate-500">Prix Total</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedOrder.totalPrice} MAD</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="bg-slate-50 p-4 rounded-md border-t">
                  <p className="text-sm font-medium text-slate-500 mb-1">Notes internes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex gap-4 text-xs text-gray-500 border-t pt-4">
                {selectedOrder.receivedDate && (
                  <span>
                    Reçu: {format(new Date(selectedOrder.receivedDate), 'dd/MM/yyyy')}
                  </span>
                )}
                {selectedOrder.deliveredDate && (
                  <span>
                    Livré: {format(new Date(selectedOrder.deliveredDate), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewDetailsOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
