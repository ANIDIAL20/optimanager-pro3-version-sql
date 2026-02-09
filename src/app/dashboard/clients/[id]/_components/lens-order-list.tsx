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
import { AlertCircle, MoreHorizontal, Eye, Trash2, Edit, Share2, Mail, Printer, PackageCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BrandLoader } from '@/components/ui/loader-brand';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { ReceiveOrderDialog } from './receive-order-dialog';

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

export function LensOrderList({ clientId, clientName }: LensOrderListProps) {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<LensOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = React.useState(false); // NEW
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
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
    const lines = [
      '📋 COMMANDE DE VERRES',
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



  // Handle print with PRO design
  const handlePrint = () => {
    if (!selectedOrder) return;
    
    // Map explicit columns to objects for the SVG helper
    const od = {
      sphere: selectedOrder.sphereR,
      cylinder: selectedOrder.cylindreR,
      axis: selectedOrder.axeR,
      addition: selectedOrder.additionR,
      hauteur: selectedOrder.hauteurR
    };
    const og = {
      sphere: selectedOrder.sphereL,
      cylinder: selectedOrder.cylindreL,
      axis: selectedOrder.axeL,
      addition: selectedOrder.additionL,
      hauteur: selectedOrder.hauteurL
    };

    // Helper to generate SVG for an eye
    const getLensSVG = (side: string, data: any) => {
      if (!data.sphere && !data.cylinder && !data.axis) return '';
      
      const axis = data.axis ? parseInt(data.axis) : 0;
      const hasAxis = !!data.axis;
      
      return `
        <div class="lens-diagram">
          <div class="lens-label">${side === 'OD' ? 'Oeil Droit (OD)' : 'Oeil Gauche (OG)'}</div>
          <svg width="120" height="120" viewBox="0 0 100 100">
            <!-- Lens Circle -->
            <circle cx="50" cy="50" r="45" fill="none" stroke="#94a3b8" stroke-width="1.5" />
            
            <!-- Axis Markings (0, 90, 180) -->
            <text x="92" y="52" font-size="8" fill="#cbd5e1" text-anchor="middle">0°</text>
            <text x="50" y="10" font-size="8" fill="#cbd5e1" text-anchor="middle">90°</text>
            <text x="8" y="52" font-size="8" fill="#cbd5e1" text-anchor="middle">180°</text>
            
            <!-- Center Cross (faint) -->
            <line x1="45" y1="50" x2="55" y2="50" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="45" x2="50" y2="55" stroke="#e2e8f0" stroke-width="1" />
            
            ${hasAxis ? `
              <!-- Axis Line -->
              <line x1="10" y1="50" x2="90" y2="50" 
                stroke="#2563eb" 
                stroke-width="2.5" 
                stroke-dasharray="0"
                transform="rotate(${-axis}, 50, 50)" 
              />
              <!-- Axis Label -->
              <text x="50" y="95" font-size="12" font-weight="bold" fill="#2563eb" text-anchor="middle">
                Axe ${axis}°
              </text>
            ` : ''}
            
            ${data.addition ? `
              <rect x="35" y="35" width="30" height="30" rx="15" fill="#f1f5f9" opacity="0.8" />
              <text x="50" y="54" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">
                ADD ${data.addition}
              </text>
            ` : ''}
          </svg>
        </div>
      `;
    };

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Commande - ${selectedOrder.lensType}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
import { BrandLoader } from '@/components/ui/loader-brand';
              
              body { 
                font-family: 'Inter', sans-serif; 
                padding: 30px; 
                max-width: 210mm; /* A4 width */
                margin: 0 auto; 
                color: #1e293b;
                line-height: 1.4;
              }
              
              /* Header */
              .header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              .company-info img {
                max-height: 70px;
                margin-bottom: 8px;
              }
              /* ... (keep other styles) */
              
              /* Lens Diagrams */
              .lens-diagrams-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 20px;
                padding: 15px;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                page-break-inside: avoid;
              }
              .lens-diagram {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .company-details {
                font-size: 0.9em;
                color: #64748b;
              }
              .order-meta {
                text-align: right;
              }
              .order-title {
                font-size: 24px;
                font-weight: 800;
                color: #2563eb;
                text-transform: uppercase;
                margin: 0;
              }
              .order-ref {
                font-size: 14px;
                color: #64748b;
                margin-top: 5px;
              }

              /* Info Grid */
              .info-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border: 1px solid #e2e8f0;
              }
              .info-item .label {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #64748b;
                font-weight: 600;
                display: block;
                margin-bottom: 4px;
              }
              .info-item .value {
                font-size: 15px;
                font-weight: 600;
                color: #0f172a;
              }

              /* Prescription Table */
              .prescription-section {
                margin-bottom: 30px;
              }
              .section-title {
                font-size: 16px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .prescription-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
              }
              .prescription-table th {
                background: #f1f5f9;
                padding: 12px;
                text-align: center;
                font-size: 12px;
                font-weight: 600;
                color: #475569;
                text-transform: uppercase;
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #e2e8f0;
              }
              .prescription-table td {
                padding: 16px;
                text-align: center;
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #e2e8f0;
                font-variant-numeric: tabular-nums;
              }
              .eye-label {
                font-weight: 800;
                color: #2563eb;
              }

              /* Lens Details */
              .lens-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
              }
              .detail-group {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                border-bottom: 1px dashed #e2e8f0;
                padding-bottom: 10px;
              }
              .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
              }

              /* Footer */
                padding-top: 20px;
              }

              /* Lens Diagrams */
              .lens-diagrams-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-bottom: 20px;
                padding: 15px;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                page-break-inside: avoid;
              }
              .lens-diagram {
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .lens-label {
                font-size: 13px;
                font-weight: 700;
                color: #475569;
                margin-bottom: 10px;
                text-transform: uppercase;
              }

              @media print {
                body { padding: 0; }
                .no-print { display: none; }
                /* Ensure background colors/graphics print */
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
            </style>
          </head>
          <body>
            
            <!-- Header -->
            <div class="header">
              <div class="company-info">
                ${shopSettings?.logoUrl ? `<img src="${shopSettings.logoUrl}" alt="Logo" />` : ''}
                <div class="company-details">
                  <strong>${shopSettings?.shopName || 'Opticien'}</strong><br>
                  ${shopSettings?.address ? `${shopSettings.address}<br>` : ''}
                  ${shopSettings?.phone ? `Tél: ${shopSettings.phone}<br>` : ''}
                  ${shopSettings?.ice ? `ICE: ${shopSettings.ice}` : ''}
                </div>
              </div>
              <div class="order-meta">
                <h1 class="order-title">Bon de Commande</h1>
                <div class="order-ref">N° #${selectedOrder.id}</div>
                <div class="order-ref">Date: ${selectedOrder.orderDate ? format(new Date(selectedOrder.orderDate), 'dd/MM/yyyy') : '-'}</div>
              </div>
            </div>

            <!-- Main Info -->
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Fournisseur</span>
                <span class="value">${selectedOrder.supplierName}</span>
              </div>
              <div class="info-item">
                <span class="label">Client Réf.</span>
                <span class="value">${clientName || 'N/A'}</span>
              </div>
               <div class="info-item">
                <span class="label">Date de livraison</span>
                <span class="value">________________</span>
              </div>
            </div>

            <!-- Prescription -->
            <div class="prescription-section">
              <div class="section-title">Correction Optique</div>
              <table class="prescription-table">
                <thead>
                  <tr>
                    <th>Oeil</th>
                    <th>Sphère</th>
                    <th>Cylindre</th>
                    <th>Axe</th>
                    <th>Addition</th>
                    <th>Ecart (EP)</th>
                    <th>Hauteur</th>
                  </tr>
                </thead>
                <tbody>
                  ${od.sphere || od.cylinder || od.axis ? `
                  <tr>
                    <td class="eye-label">OD</td>
                    <td>${od.sphere || '-'}</td>
                    <td>${od.cylinder || '-'}</td>
                    <td>${od.axis ? `${od.axis}°` : '-'}</td>
                    <td>${od.addition || '-'}</td>
                     <td>${od.ecartPupillaire || '-'}</td>
                    <td>${od.hauteur || '-'}</td>
                  </tr>` : ''}
                  ${og.sphere || og.cylinder || og.axis ? `
                  <tr>
                    <td class="eye-label">OG</td>
                    <td>${og.sphere || '-'}</td>
                    <td>${og.cylinder || '-'}</td>
                    <td>${og.axis ? `${og.axis}°` : '-'}</td>
                    <td>${og.addition || '-'}</td>
                    <td>${og.ecartPupillaire || '-'}</td>
                    <td>${og.hauteur || '-'}</td>
                  </tr>` : ''}
                </tbody>
              </table>
            </div>

            <!-- Lens Diagrams (Axis & Addition) -->
            ${(od.axis || og.axis || od.addition || og.addition) ? `
              <div class="prescription-section">
                <div class="section-title">Schéma de Montage (Axe & Addition)</div>
                <div class="lens-diagrams-container">
                  ${getLensSVG('OD', od)}
                  ${getLensSVG('OG', og)}
                </div>
              </div>
            ` : ''}

            <!-- Technical Details -->
            <div class="lens-details">
              <div class="detail-group">
                <div class="section-title">Caractéristiques Verres</div>
                <div class="detail-row">
                  <span class="label">Type de verre</span>
                  <span class="value"><strong>${selectedOrder.lensType}</strong></span>
                </div>
                 <div class="detail-row">
                  <span class="label">Géométrie</span>
                  <span class="value">${selectedOrder.orderType}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Quantité</span>
                  <span class="value">${selectedOrder.quantity}</span>
                </div>
              </div>
              
              <div class="detail-group">
                <div class="section-title">Traitements & Options</div>
                <div class="detail-row">
                  <span class="label">Traitements</span>
                  <span class="value">${selectedOrder.treatment || 'Standard'}</span>
                </div>
                 <div class="detail-row">
                  <span class="label">Diamètre</span>
                  <span class="value">${od.diameter || og.diameter ? `OD: ${od.diameter || '-'} / OG: ${og.diameter || '-'}` : '-'}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            ${selectedOrder.notes ? `
            <div class="detail-group" style="margin-bottom: 30px;">
              <div class="section-title">Notes & Instructions Spéciales</div>
              <p style="font-size: 14px; color: #475569;">${selectedOrder.notes}</p>
            </div>` : ''}

            <!-- Footer -->
            <div class="footer">
              <p>Document généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}</p>
              <p>Merci de votre confiance.</p>
            </div>

          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    setIsShareDialogOpen(false);
    toast({ title: 'Impression', description: 'Document prêt à imprimer' });
  };
   
  // ... (rest of component: handleDelete, Table, etc.)


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
                      <SensitiveData value={parseFloat(order.totalPrice)} type="currency" />
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
                          {(order.status === 'pending' || order.status === 'ordered') && (
                            <DropdownMenuItem onClick={() => handleOpenReceiveDialog(order)} className="text-orange-600 focus:text-orange-600">
                              <PackageCheck className="mr-2 h-4 w-4" />
                              Réceptionner
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenShareDialog(order)} className="text-blue-600 focus:text-blue-600">
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager avec fournisseur
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(order.id)}
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
            loadOrders();
            // Automatically switch to view details or close
        }}
      />

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

              {/* Prescription Details */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Correction Optique</h4>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <p className="font-bold text-blue-700 border-b pb-1">Oeil Droit (OD)</p>
                    <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                      <span>Sphère:</span> <span className="font-semibold text-slate-900">{selectedOrder.sphereR || '-'}</span>
                      <span>Cylindre:</span> <span className="font-semibold text-slate-900">{selectedOrder.cylindreR || '-'}</span>
                      <span>Axe:</span> <span className="font-semibold text-slate-900">{selectedOrder.axeR ? `${selectedOrder.axeR}°` : '-'}</span>
                      <span>Addition:</span> <span className="font-semibold text-slate-900">{selectedOrder.additionR || '-'}</span>
                      <span>Hauteur:</span> <span className="font-semibold text-slate-900">{selectedOrder.hauteurR || '-'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-blue-700 border-b pb-1">Oeil Gauche (OG)</p>
                    <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                      <span>Sphère:</span> <span className="font-semibold text-slate-900">{selectedOrder.sphereL || '-'}</span>
                      <span>Cylindre:</span> <span className="font-semibold text-slate-900">{selectedOrder.cylindreL || '-'}</span>
                      <span>Axe:</span> <span className="font-semibold text-slate-900">{selectedOrder.axeL ? `${selectedOrder.axeL}°` : '-'}</span>
                      <span>Addition:</span> <span className="font-semibold text-slate-900">{selectedOrder.additionL || '-'}</span>
                      <span>Hauteur:</span> <span className="font-semibold text-slate-900">{selectedOrder.hauteurL || '-'}</span>
                    </div>
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

      {/* Share Dialog */}
      <Dialog modal={false} open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
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
