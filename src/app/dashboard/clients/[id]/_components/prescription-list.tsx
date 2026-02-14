'use client';

import * as React from 'react';
import { getPrescriptions, deletePrescription } from '@/app/actions/prescriptions-actions';
import type { Prescription } from '@/app/actions/prescriptions-actions';
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
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PrescriptionListProps {
  clientId: string;
}

export function PrescriptionList({ clientId }: PrescriptionListProps) {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const loadPrescriptions = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getPrescriptions(clientId);
      
      if (result.success && result.data) {
        setPrescriptions(result.data);
      } else {
        setError(result.error || 'Erreur de chargement');
      }
    } catch (err) {
      setError('Erreur de chargement des ordonnances');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleDelete = async (prescriptionId: string) => {
    // Confirmation handled by AlertDialog
    
    setDeletingId(prescriptionId);
    try {
      const result = await deletePrescription(prescriptionId);
      if (result.success) {
        toast({ title: 'Succès', description: 'Ordonnance supprimée' });
        loadPrescriptions();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Mesures Lunettes</CardTitle>
        <CardDescription>
          Liste de toutes les prescriptions de lunettes enregistrées pour ce client.
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
        {!isLoading && !error && prescriptions && prescriptions.length === 0 && (
          <div className="text-center text-muted-foreground py-6">
            Aucune prescription de lunettes trouvée pour ce client.
          </div>
        )}
        {!isLoading && prescriptions && prescriptions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>OD Sphère/Cyl/Axe</TableHead>
                <TableHead>OG Sphère/Cyl/Axe</TableHead>
                <TableHead>Addition</TableHead>
                <TableHead>EP (OD/OG)</TableHead>
                <TableHead>Hauteur (OD/OG)</TableHead>
                <TableHead>Docteur</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {p.data?.od ? `${p.data.od.sphere || '-'} / ${p.data.od.cylinder || '-'} / ${p.data.od.axis || '-'}°` : '-'}
                  </TableCell>
                  <TableCell>
                    {p.data?.og ? `${p.data.og.sphere || '-'} / ${p.data.og.cylinder || '-'} / ${p.data.og.axis || '-'}°` : '-'}
                  </TableCell>
                  <TableCell>
                    {p.data?.od?.addition || p.data?.og?.addition 
                      ? `OD:${p.data.od?.addition || '-'} | OG:${p.data.og?.addition || '-'}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {p.data?.od?.pd || p.data?.og?.pd 
                      ? `${p.data.od?.pd || '-'} | ${p.data.og?.pd || '-'}`
                      : p.data?.pd || '-'}
                  </TableCell>
                  <TableCell>
                    {p.data?.od?.height || p.data?.og?.height 
                      ? `${p.data.od?.height || '-'} | ${p.data.og?.height || '-'}`
                      : '-'}
                  </TableCell>
                  <TableCell>{p.data?.doctorName || '-'}</TableCell>
                  <TableCell>
                      {/* @ts-ignore */}
                      <AlertDialog modal={false}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === p.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent 
                          onInteractOutside={(e) => e.preventDefault()}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                          onCloseAutoFocus={(e) => {
                            e.preventDefault();
                            document.body.style.pointerEvents = 'auto';
                          }}
                        >
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer l'ordonnance ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. L'ordonnance sera définitivement supprimée de l'historique du client.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(p.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
