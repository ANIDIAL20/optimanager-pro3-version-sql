// @ts-nocheck
'use client';

import * as React from 'react';
import { getClientLensOrders, updateLensOrder, deleteLensOrder } from '@/app/actions/lens-orders-actions';
import { getShopSettings } from '@/app/actions/shop-settings-actions';
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
import { AlertCircle, MoreHorizontal, Eye, Trash2, Edit, Share2, Mail, Printer, PackageCheck, ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BrandLoader } from '@/components/ui/loader-brand';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { ReceiveOrderDialog } from './receive-order-dialog';

interface LensOrderListProps {
  clientId: string;
  clientName: string;
  mode: 'glasses' | 'contacts';
  onUseOrder?: (orderId: number) => void;
}

type LensOrderStatus = 'pending' | 'ordered' | 'received' | 'delivered';

interface LensOrder {
  id: number;
  lensType: string;
  supplierName: string;
  orderType: string;
  treatment: string | null;
  unitPrice: string;
  sellingPrice: string;
  quantity: number;
  totalPrice: string;
  amountPaid: string | null; // ✅ Avance versée à la commande
  status: string;
  orderDate: Date | null;
  receivedDate: Date | null;
  deliveredDate: Date | null;
  // Explicit Eye Prescription
  sphereR: string | null;
  cylindreR: string | null;
  axeR: string | null;
  additionR: string | null;
  hauteurR: string | null;
  sphereL: string | null;
  cylindreL: string | null;
  axeL: string | null;
  additionL: string | null;
  hauteurL: string | null;
  matiere: string | null;
  indice: string | null;
  notes: string | null;
  ecartPupillaireR: string | null;
  ecartPupillaireL: string | null;
  diameterR: string | null;
  diameterL: string | null;
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { variant: any; label: string; className?: string }> = {
    pending: { variant: 'outline', label: 'En Attente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' },
    ordered: { variant: 'default', label: 'Commandée', className: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' },
    received: { variant: 'secondary', label: 'Reçue', className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' },
    delivered: { variant: 'default', label: 'Livrée', className: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' }
  };

  const config = statusMap[status] || { variant: 'outline', label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

export function LensOrderList({ clientId, clientName, mode = 'glasses', onUseOrder }: LensOrderListProps) {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<LensOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = React.useState(false); // NEW
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<LensOrder | null>(null);
  const [newStatus, setNewStatus] = React.useState<LensOrderStatus>('pending');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [shopSettings, setShopSettings] = React.useState<any>(null);

  // Load shop settings on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getShopSettings();
        if (result.success && result.data) {
          setShopSettings(result.data);
        }
      } catch (error) {
        console.error('Error loading shop settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Load orders
  const loadOrders = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getClientLensOrders(clientId);

      if (result.success && result.data) {
        const allOrders = result.data as LensOrder[];

        // Filter based on mode
        const filtered = allOrders.filter(o => {
          if (mode === 'contacts') return o.orderType === 'contact';
          return o.orderType !== 'contact';
        });

        setOrders(filtered);
      } else {
        setError(result.error || 'Erreur de chargement');
      }
    } catch (err) {
      setError('Erreur de chargement des commandes');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, mode]);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Open update dialog
  const handleOpenUpdateDialog = (order: LensOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status as LensOrderStatus);
    setIsUpdateDialogOpen(true);
  };

  // Open receive dialog
  const handleOpenReceiveDialog = (order: LensOrder) => {
    setSelectedOrder(order);
    setIsReceiveDialogOpen(true);
  };

  // Open view details
  const handleOpenViewDetails = (order: LensOrder) => {
    setSelectedOrder(order);
    setIsViewDetailsOpen(true);
  };

  // Open share dialog
  const handleOpenShareDialog = (order: LensOrder) => {
    setSelectedOrder(order);
    setIsShareDialogOpen(true);
  };

  // Generate order text for sharing
  const generateOrderText = (order: LensOrder) => {
    const title = mode === 'contacts' ? '📋 COMMANDE DE LENTILLES' : '📋 COMMANDE DE VERRES';
    const lines = [
      title,
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      `📅 Date: ${order.orderDate ? format(new Date(order.orderDate), 'dd/MM/yyyy') : '-'}`,
      `👤 Client: ${clientName || 'N/A'}`,
      '',
      '🔍 DÉTAILS:',
      `• Type de verre: ${order.lensType}`,
      `• Type de commande: ${order.orderType}`,
      `• Traitement: ${order.treatment || 'Aucun'}`,
      order.sphereR || order.cylindreR ? `• OD: Sph ${order.sphereR || '-'} Cyl ${order.cylindreR || '-'} Axe ${order.axeR || '-'} Add ${order.additionR || '-'}` : '',
      order.sphereL || order.cylindreL ? `• OG: Sph ${order.sphereL || '-'} Cyl ${order.cylindreL || '-'} Axe ${order.axeL || '-'} Add ${order.additionL || '-'}` : '',
      '',
      '💰 PRIX:',
      `• Prix unitaire: ${parseFloat(order.unitPrice).toFixed(2)} DH`,
      `• Quantité: ${order.quantity}`,
      `• Prix total: ${parseFloat(order.totalPrice).toFixed(2)} DH`,
      '',
      order.notes ? `📝 Notes: ${order.notes}` : '',
      '',
      '━━━━━━━━━━━━━━━━━━━━',
    ];
    return lines.filter(l => l !== '').join('\n');
  };

  // Handle email share
  const handleEmailShare = () => {
    if (!selectedOrder) return;
    const subject = `Commande de verres - ${selectedOrder.lensType}`;
    const body = encodeURIComponent(generateOrderText(selectedOrder));
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank');
    setIsShareDialogOpen(false);
    toast({ title: 'Email prêt', description: 'Votre client email va s\'ouvrir' });
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    if (!selectedOrder) return;
    const text = encodeURIComponent(generateOrderText(selectedOrder));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setIsShareDialogOpen(false);
    toast({ title: 'WhatsApp ouvert', description: 'Partagez la commande via WhatsApp' });
  };



  // Navigate to the dedicated Bon de Commande Labo print page
  const handlePrint = () => {
    if (!selectedOrder) return;
    window.open(`/dashboard/lens-orders/${selectedOrder.id}/print`, '_blank');
    setIsShareDialogOpen(false);
  };
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

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedOrder) return;

    setDeletingId(selectedOrder.id);
    try {
      const result = await deleteLensOrder(selectedOrder.id.toString());

      if (result.success) {
        toast({ title: 'Succès', description: 'Commande supprimée' });
        loadOrders();
        setIsDeleteDialogOpen(false);
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
          <CardTitle>
            {mode === 'contacts' ? 'Historique des Commandes de Lentilles' : 'Historique des Commandes de Verres'}
          </CardTitle>
          <CardDescription>
            {mode === 'contacts'
              ? 'Liste de toutes les commandes de lentilles pour ce client.'
              : 'Liste de toutes les commandes de verres pour ce client.'}
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
              {mode === 'contacts'
                ? 'Aucune commande de lentilles trouvée pour ce client.'
                : 'Aucune commande de verres trouvée pour ce client.'}
            </div>
          )}
          {!isLoading && orders && orders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>{mode === 'contacts' ? 'Modèle Lentille' : 'Type Verre'}</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Finances</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs font-medium text-slate-500">
                          Total: <SensitiveData value={parseFloat(order.totalPrice)} type="currency" />
                        </div>
                        {Number(order.amountPaid ?? 0) > 0 && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 h-4">
                            Avance: {Number(order.amountPaid).toFixed(0)} DH
                          </Badge>
                        )}
                        <div className="text-sm font-bold text-slate-900 border-t border-slate-100 pt-0.5 mt-0.5">
                          Reste: {Math.max(0, parseFloat(order.totalPrice) - Number(order.amountPaid ?? 0)).toFixed(2)} DH
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
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
                          {(order.status === 'pending' || order.status === 'ordered') && (
                            <DropdownMenuItem onClick={() => handleOpenReceiveDialog(order)} className="text-orange-600 focus:text-orange-600">
                              <PackageCheck className="mr-2 h-4 w-4" />
                              Réceptionner
                            </DropdownMenuItem>
                          )}
                          {order.status === 'received' && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (onUseOrder) {
                                  onUseOrder(order.id);
                                } else {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('tab', 'sales');
                                  url.searchParams.set('orderId', order.id.toString());
                                  window.history.replaceState({}, '', url);
                                  window.location.reload();
                                }
                              }}
                              className="text-emerald-600 focus:text-emerald-600 font-bold"
                            >
                              <ShoppingBag className="mr-2 h-4 w-4" />
                              Vendre au POS
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenShareDialog(order)} className="text-blue-600 focus:text-blue-600">
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager avec fournisseur
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDeleteDialogOpen(true);
                            }}
                            disabled={deletingId === order.id}
                            className="text-red-600 focus:text-red-600"
                          >
                            {deletingId === order.id ? (
                              <BrandLoader size="sm" className="mr-2" />
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

      {/* @ts-ignore */}
      <Dialog modal={false} open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = 'auto';
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
              modal={false}
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
              {isUpdating && <BrandLoader size="sm" className="mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Order Dialog */}
      <ReceiveOrderDialog
        open={isReceiveDialogOpen}
        onOpenChange={setIsReceiveDialogOpen}
        order={selectedOrder}
        onSuccess={() => {
          setIsReceiveDialogOpen(false);
          loadOrders();
        }}
      />

      {/* @ts-ignore */}
      <AlertDialog modal={false} open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = 'auto';
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La commande sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deletingId !== null}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingId !== null ? <BrandLoader size="sm" className="mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* @ts-ignore */}
      <Dialog modal={false} open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent
          className="max-w-3xl"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = 'auto';
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

              {/* Prescription Details */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Correction Optique</h4>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <p className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      Oeil Droit (OD)
                    </p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 px-2 text-slate-600">
                      <span>Sphère:</span> <span className="font-bold text-slate-900">{selectedOrder.sphereR || '-'}</span>
                      <span>Cylindre:</span> <span className="font-bold text-slate-900">{selectedOrder.cylindreR || '-'}</span>
                      <span>Axe:</span> <span className="font-bold text-slate-900">{selectedOrder.axeR ? `${selectedOrder.axeR}°` : '-'}</span>
                      <span>Addition:</span> <span className="font-bold text-slate-900">{selectedOrder.additionR || '-'}</span>
                      <div className="col-span-2 border-t pt-1 mt-1 grid grid-cols-2">
                        <span className="text-xs text-slate-500 uppercase">EP:</span> <span className="font-bold text-blue-800">{selectedOrder.ecartPupillaireR || '-'}</span>
                        <span className="text-xs text-slate-500 uppercase">H:</span> <span className="font-bold text-blue-800">{selectedOrder.hauteurR || '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      Oeil Gauche (OG)
                    </p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 px-2 text-slate-600">
                      <span>Sphère:</span> <span className="font-bold text-slate-900">{selectedOrder.sphereL || '-'}</span>
                      <span>Cylindre:</span> <span className="font-bold text-slate-900">{selectedOrder.cylindreL || '-'}</span>
                      <span>Axe:</span> <span className="font-bold text-slate-900">{selectedOrder.axeL ? `${selectedOrder.axeL}°` : '-'}</span>
                      <span>Addition:</span> <span className="font-bold text-slate-900">{selectedOrder.additionL || '-'}</span>
                      <div className="col-span-2 border-t pt-1 mt-1 grid grid-cols-2">
                        <span className="text-xs text-slate-500 uppercase">EP:</span> <span className="font-bold text-indigo-800">{selectedOrder.ecartPupillaireL || '-'}</span>
                        <span className="text-xs text-slate-500 uppercase">H:</span> <span className="font-bold text-indigo-800">{selectedOrder.hauteurL || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p><span className="text-slate-500">Diamètre OD:</span> <span className="font-medium">{selectedOrder.diameterR || '-'}</span></p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="text-slate-500">Diamètre OG:</span> <span className="font-medium">{selectedOrder.diameterL || '-'}</span></p>
                  </div>
                </div>
                {(selectedOrder.matiere || selectedOrder.indice) && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                    {selectedOrder.matiere && <p><span className="text-slate-500">Matière:</span> <span className="font-medium">{selectedOrder.matiere}</span></p>}
                    {selectedOrder.indice && <p><span className="text-slate-500">Indice:</span> <span className="font-medium">{selectedOrder.indice}</span></p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Prix Unitaire</p>
                  <p className="text-lg font-semibold">
                    <SensitiveData value={parseFloat(selectedOrder.unitPrice)} type="currency" />
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Quantité</p>
                  <p className="text-lg font-semibold">{selectedOrder.quantity}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-slate-500">Prix Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    <SensitiveData value={parseFloat(selectedOrder.totalPrice)} type="currency" className="text-blue-600" />
                  </p>
                </div>

                {/* ✅ FIX Bug 2 : Affichage Avance + Reste à payer */}
                {Number(selectedOrder.amountPaid ?? 0) > 0 && (
                  <>
                    <div className="col-span-2 border-t border-dashed border-slate-200 pt-3">
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Avance versée</p>
                          <p className="text-lg font-bold text-emerald-700">
                            <SensitiveData value={Number(selectedOrder.amountPaid)} type="currency" className="text-emerald-700" />
                          </p>
                        </div>
                        <div className="h-9 w-9 bg-emerald-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div>
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Reste à payer</p>
                          <p className="text-xl font-bold text-amber-800">
                            <SensitiveData
                              value={Math.max(0, parseFloat(selectedOrder.totalPrice) - Number(selectedOrder.amountPaid ?? 0))}
                              type="currency"
                              className="text-amber-800"
                            />
                          </p>
                        </div>
                        <div className="h-9 w-9 bg-amber-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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

      {/* @ts-ignore */}
      <Dialog modal={false} open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = 'auto';
          }}
        >
          <DialogHeader>
            <DialogTitle>Partager la commande</DialogTitle>
            <DialogDescription>
              Choisissez comment partager cette commande avec le fournisseur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleEmailShare}
            >
              <Mail className="mr-3 h-5 w-5 text-blue-600" />
              <div className="text-left">
                <div className="font-semibold">Email</div>
                <div className="text-xs text-muted-foreground">Envoyer par email au fournisseur</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleWhatsAppShare}
            >
              <div className="mr-3 h-5 w-5 text-green-600 flex items-center justify-center font-bold">📱</div>
              <div className="text-left">
                <div className="font-semibold">WhatsApp</div>
                <div className="text-xs text-muted-foreground">Partager via WhatsApp</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handlePrint}
            >
              <Printer className="mr-3 h-5 w-5 text-slate-600" />
              <div className="text-left">
                <div className="font-semibold">Imprimer / PDF</div>
                <div className="text-xs text-muted-foreground">Générer un document imprimable</div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsShareDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
