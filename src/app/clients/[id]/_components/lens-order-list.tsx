'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { ClientLensOrder } from '@/lib/types';
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
import { AlertCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface LensOrderListProps {
  clientId: string;
  clientName?: string;
}

const getStatusBadge = (status: ClientLensOrder['status']) => {
  switch (status) {
    case 'Draft':
      return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Brouillon</Badge>;
    case 'Ordered':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 shadow-none">Commandée</Badge>;
    case 'Received':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 shadow-none">Reçue</Badge>;
    case 'Delivered':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none">Livrée</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function LensOrderList({ clientId, clientName }: LensOrderListProps) {
  const firestore = useFirestore();
  const { user } = useFirebase();

  // -- STATE DECLARATIONS --
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<ClientLensOrder | null>(null);
  const [newStatus, setNewStatus] = React.useState<ClientLensOrder['status']>('Draft');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const ordersQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
          collection(firestore, `stores/${user.uid}/clients/${clientId}/lens_orders`),
          orderBy('orderDate', 'desc')
        )
        : null,
    [firestore, user, clientId]
  );

  const {
    data: orders,
    isLoading,
    error,
  } = useCollection<ClientLensOrder>(ordersQuery);

  const handleOpenUpdateDialog = (order: ClientLensOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setIsUpdateDialogOpen(true);
  };

  const handleOpenViewDetails = (order: ClientLensOrder) => {
    setSelectedOrder(order);
    setIsViewDetailsOpen(true);
  };

  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleUpdateStatus = async () => {
    if (!firestore || !user || !selectedOrder) return;

    setIsUpdating(true);
    startTransition(async () => {
      try {
        const orderRef = doc(firestore, `stores/${user.uid}/clients/${clientId}/lens_orders`, selectedOrder.id);
        await updateDoc(orderRef, {
          status: newStatus
        });

        setIsUpdateDialogOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Error updating status:", error);
      } finally {
        setIsUpdating(false);
      }
    });
  };

  const handleGeneratePDF = async (order: ClientLensOrder) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      // -- Header --
      doc.setFontSize(20);
      doc.text("OptiManager Pro", 14, 22);
      doc.setFontSize(10);
      doc.text("Votre Opticien Expert", 14, 28);

      // -- Title --
      doc.setFontSize(16);
      doc.text("BON DE COMMANDE - VERRES", 105, 40, { align: "center" });

      // -- Meta Info --
      doc.setFontSize(10);
      doc.text(`Date de commande: ${format(new Date(order.orderDate), 'dd/MM/yyyy')}`, 14, 50);
      doc.text(`Référence Client: ${clientName || `Ref #${clientId.slice(0, 8)}`}`, 14, 56);

      // -- Details Table --
      const head = [['Oeil', 'Sphère', 'Cylindre', 'Axe', 'Addition', 'Type / Traitements']];
      const data = [
        [
          'OD (Droit)',
          order.correction.odSphere || '-',
          order.correction.odCylindre || '-',
          order.correction.odAxe || '-',
          order.correction.odAddition || '-',
          `${order.lensType}\n${order.treatments.join(', ')}`
        ],
        [
          'OG (Gauche)',
          order.correction.ogSphere || '-',
          order.correction.ogCylindre || '-',
          order.correction.ogAxe || '-',
          order.correction.ogAddition || '-',
          `${order.lensType}\n${order.treatments.join(', ')}`
        ]
      ];

      autoTable(doc, {
        startY: 65,
        head: head,
        body: data,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      });

      // -- Footer --
      doc.text("Merci de confirmer la réception de cette commande.", 14, (doc as any).lastAutoTable.finalY + 15);

      // Save
      const fileName = `Commande_Verres_${(clientName || clientId).replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      // -- Update Status --
      if (order.status === 'Draft' && firestore && user) {
        const orderRef = doc(firestore, `stores/${user.uid}/clients/${clientId}/lens_orders`, order.id);
        await updateDoc(orderRef, { status: 'Ordered' });
        router.refresh();
      }
    } catch (err) {
      console.error("PDF Gen Error:", err);
      // We could define a toast here, but relying on browser behavior is mostly sufficient for now
      alert("Erreur lors de la génération du PDF.");
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
                Impossible de charger l'historique des commandes.
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
                  <TableHead>Statut</TableHead>
                  <TableHead>Correction (OD)</TableHead>
                  <TableHead>Correction (OG)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{format(new Date(order.orderDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{order.lensType}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{`${order.correction.odSphere || '-'} (${order.correction.odCylindre || '-'})`}</TableCell>
                    <TableCell>{`${order.correction.ogSphere || '-'} (${order.correction.ogCylindre || '-'})`}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenViewDetails(order)}>
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenUpdateDialog(order)}>
                            Modifier le statut
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGeneratePDF(order)}>
                            Transférer au fournisseur (PDF)
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

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut de la commande</DialogTitle>
            <DialogDescription>
              Mettez à jour le statut actuel pour la commande du {selectedOrder && format(new Date(selectedOrder.orderDate), 'dd/MM/yyyy')}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={(val) => setNewStatus(val as ClientLensOrder['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Brouillon
                  </span>
                </SelectItem>
                <SelectItem value="Ordered">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Commandée (Fournisseur)
                  </span>
                </SelectItem>
                <SelectItem value="Received">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    Reçue (Atelier)
                  </span>
                </SelectItem>
                <SelectItem value="Delivered">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Livrée (Client)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détails de la Commande</DialogTitle>
            <DialogDescription>
              Commande du {selectedOrder && format(new Date(selectedOrder.orderDate), 'dd/MM/yyyy')}
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
                  <p className="text-sm font-medium text-slate-500">Fournisseur (ID)</p>
                  <p className="text-base">{selectedOrder.supplierId || 'Non spécifié'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-slate-500">Traitements</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedOrder.treatments.length > 0 ? (
                      selectedOrder.treatments.map((t, i) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">Aucun traitement</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[100px]">Oeil</TableHead>
                      <TableHead>Sphère</TableHead>
                      <TableHead>Cylindre</TableHead>
                      <TableHead>Axe</TableHead>
                      <TableHead>Addition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-bold">OD</TableCell>
                      <TableCell>{selectedOrder.correction.odSphere || '-'}</TableCell>
                      <TableCell>{selectedOrder.correction.odCylindre || '-'}</TableCell>
                      <TableCell>{selectedOrder.correction.odAxe || '-'}</TableCell>
                      <TableCell>{selectedOrder.correction.odAddition || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold">OG</TableCell>
                      <TableCell>{selectedOrder.correction.ogSphere || '-'}</TableCell>
                      <TableCell>{selectedOrder.correction.ogCylindre || '-'}</TableCell>
                      <TableCell>{selectedOrder.correction.ogAxe || '-'}</TableCell>
                      <TableCell>{selectedOrder.correction.ogAddition || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {selectedOrder.notes && (
                <div className="bg-slate-50 p-4 rounded-md">
                  <p className="text-sm font-medium text-slate-500 mb-1">Notes internes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
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
