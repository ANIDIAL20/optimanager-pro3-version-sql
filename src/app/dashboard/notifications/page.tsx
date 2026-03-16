import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import {
  getReservationsExpiring,
  getStockCritique,
  getVerresPrets,
  getCommandesEnAttente,
  type ReservationExpiringItem,
  type VerrePretItem,
  type CommandeEnAttenteItem,
  type StockCritiqueItem,
} from '@/app/actions/derived-alerts-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Eye,
  CalendarClock,
  PackageX,
  ShoppingCart,
  User,
} from 'lucide-react';
import { NotifCard } from "@/features/notifications/components/notif-card";
import { NotifCardActions } from "@/features/notifications/components/notif-card-actions";
import { StatCard } from "@/features/notifications/components/stat-card";
import { EmptyState } from "@/features/notifications/components/empty-state";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [commandesRes, verresRes, reservationsRes, stockRes] = await Promise.all([
    getCommandesEnAttente(),
    getVerresPrets(),
    getReservationsExpiring(),
    getStockCritique(),
  ]);

  const commandes = commandesRes.success ? commandesRes.data : [];
  const verres    = verresRes.success    ? verresRes.data    : [];
  const reservations = reservationsRes.success ? reservationsRes.data : [];
  const stock     = stockRes.success     ? stockRes.data     : [];

  const total = (commandes?.length ?? 0) + (verres?.length ?? 0) + (reservations?.length ?? 0) + (stock?.length ?? 0);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Alertes opérationnelles en temps réel pour votre boutique</p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-700">{total} alerte{total > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={commandes?.length ?? 0} label="Commandes" icon={<ShoppingCart className="h-5 w-5" />} variant="default" />
        <StatCard value={verres?.length ?? 0} label="Verres" icon={<Eye className="h-5 w-5" />} variant="default" />
        <StatCard value={reservations?.length ?? 0} label="Réservations" icon={<User className="h-5 w-5" />} variant="warning" />
        <StatCard value={stock?.length ?? 0} label="Stock" icon={<PackageX className="h-5 w-5" />} variant="danger" />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="commandes" className="w-full">
        <TabsList className="w-full justify-start h-auto bg-white border border-slate-200 p-1 rounded-2xl gap-1">
          <TabsTrigger value="commandes" className="rounded-xl gap-2 flex-1 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Commandes</span>
            {(commandes?.length ?? 0) > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {commandes?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="verres" className="rounded-xl gap-2 flex-1 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Verres</span>
            {(verres?.length ?? 0) > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {verres?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reservations" className="rounded-xl gap-2 flex-1 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Réservations</span>
            {(reservations?.length ?? 0) > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {reservations?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stock" className="rounded-xl gap-2 flex-1 py-2.5 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <PackageX className="h-4 w-4" />
            <span className="hidden sm:inline">Stock</span>
            {(stock?.length ?? 0) > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {stock?.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commandes" className="mt-6">
          <div className="min-h-[300px]">
            {!commandes || commandes.length === 0 ? (
              <EmptyState message="Aucune commande en attente" />
            ) : (
              <div className="space-y-3">
                {commandes.map((o: CommandeEnAttenteItem) => (
                  <NotifCard
                    key={o.id}
                    title={o.client?.fullName || 'Client inconnu'}
                    message={`${o.lensType || 'Verre'} • ${parseFloat(o.sellingPrice || '0').toFixed(2)} MAD`}
                    type="order"
                    createdAt={new Date(o.updatedAt || new Date())}
                    isRead={false}
                    actions={<NotifCardActions id={o.id} type="order" clientId={o.client?.id} />}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="verres" className="mt-6">
          <div className="min-h-[300px]">
            {!verres || verres.length === 0 ? (
              <EmptyState message="Aucun verre prêt à livrer" />
            ) : (
              <div className="space-y-3">
                {verres.map((o: VerrePretItem) => (
                  <NotifCard
                    key={o.id}
                    title={o.client?.fullName || 'Client inconnu'}
                    message={`${o.lensType || 'Verre'} • ${parseFloat(o.sellingPrice || '0').toFixed(2)} MAD`}
                    type="lens"
                    createdAt={new Date(o.createdAt || o.updatedAt || new Date())}
                    isRead={false}
                    actions={<NotifCardActions id={o.id} type="lens" clientId={o.client?.id} />}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="mt-6">
          <div className="min-h-[300px]">
            {!reservations || reservations.length === 0 ? (
              <EmptyState message="Aucune réservation expirant bientôt" />
            ) : (
              <div className="space-y-3">
                {reservations.map((r: ReservationExpiringItem) => {
                  const productName = r.items && r.items.length > 0 ? r.items[0].productName : 'Monture';
                  return (
                    <NotifCard
                      key={r.id}
                      title={r.clientName}
                      message={`${productName} • Expire le ${new Date(r.expiryDate).toLocaleDateString('fr-FR')}`}
                      type="reservation"
                      createdAt={r.createdAt ? new Date(r.createdAt) : new Date()}
                      isRead={false}
                      actions={<NotifCardActions id={r.id} type="reservation" clientId={r.clientId} />}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <div className="min-h-[300px]">
            {!stock || stock.length === 0 ? (
              <EmptyState message="Stock en bonne santé" />
            ) : (
              <div className="space-y-3">
                {stock.map((p: StockCritiqueItem) => (
                  <NotifCard
                    key={p.id}
                    title={p.nom}
                    message={`Réf: ${p.reference || '---'} • Reste: ${p.quantiteStock}`}
                    type="stock"
                    createdAt={new Date()}
                    isRead={false}
                    actions={<NotifCardActions id={parseInt(p.id)} type="stock" />}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
