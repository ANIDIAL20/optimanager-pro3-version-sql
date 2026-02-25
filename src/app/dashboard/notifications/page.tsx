import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth-helpers';
import {
  getReservationsExpiring,
  getStockCritique,
  getVerresPrets,
} from '@/app/actions/notifications-actions';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import Link from 'next/link';
import { differenceInDays } from 'date-fns';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [verresRes, reservationsRes, stockRes] = await Promise.all([
    getVerresPrets(),
    getReservationsExpiring(),
    getStockCritique(),
  ]);

  const verres = verresRes.success ? verresRes.data : [];
  const reservations = reservationsRes.success ? reservationsRes.data : [];
  const stock = stockRes.success ? stockRes.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Accès rapide aux verres prêts, réservations expirantes et stock critique.
        </p>
      </div>

      <Tabs defaultValue="verres" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="verres" className="gap-2">
            📦 Verres Prêts
            <Badge variant="secondary">{verres.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-2">
            📅 Réservations
            <Badge variant="secondary">{reservations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            🧊 Stock Critique
            <Badge variant="secondary">{stock.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verres" className="mt-6">
          <div className="space-y-3">
            {verres.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Aucune commande de verres prête.
                </CardContent>
              </Card>
            ) : (
              verres.map((o: any) => (
                <Card key={o.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{o.client?.fullName || 'Client'}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {o.lensType} • {parseFloat(o.sellingPrice || '0').toFixed(2)} MAD
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild size="sm">
                        <Link href={`/dashboard/clients/${o.client?.id}?tab=sales`}>Livrer au POS →</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/clients/${o.client?.id}`}>Dossier</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="mt-6">
          <div className="space-y-3">
            {reservations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Aucune réservation expirant dans les 7 prochains jours.
                </CardContent>
              </Card>
            ) : (
              reservations.map((r: any) => {
                const daysLeft = differenceInDays(new Date(r.expiryDate), new Date());
                const badgeClass =
                  daysLeft === 0
                    ? 'bg-red-600 text-white'
                    : daysLeft <= 3
                      ? 'bg-orange-500 text-white'
                      : 'bg-emerald-600 text-white';

                return (
                  <Card key={r.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.clientName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          Expire le {new Date(r.expiryDate).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badgeClass}`}>
                          {daysLeft === 0 ? 'Auj.' : `${daysLeft}j`}
                        </span>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/clients/${r.clientId}?tab=reservations`}>Voir Dossier →</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <div className="space-y-3">
            {stock.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Aucun produit en stock critique.
                </CardContent>
              </Card>
            ) : (
              stock.map((p: any) => {
                const isRupture = Number(p.quantiteStock) < 0;
                return (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.nom}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          Réf: {p.reference || '---'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={isRupture ? 'destructive' : 'secondary'}>
                          Stock: {p.quantiteStock}
                        </Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/produits/${p.id}`}>Commander</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
