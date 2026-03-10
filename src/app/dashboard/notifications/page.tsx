import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import {
  getReservationsExpiring,
  getStockCritique,
  getVerresPrets,
  getCommandesEnAttente,
} from '@/app/actions/notifications-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { differenceInDays } from 'date-fns';
import {
  Clock,
  Eye,
  CalendarClock,
  PackageX,
  ArrowRight,
  CheckCircle2,
  Package,
  User,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Per-category theme config
// ─────────────────────────────────────────────────────────────────────────────
const themes = {
  commandes: {
    color: 'blue',
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    Icon: Clock,
    tabActive: 'data-[state=active]:text-blue-700 data-[state=active]:border-blue-500',
  },
  verres: {
    color: 'emerald',
    bg: 'bg-emerald-50',
    border: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    Icon: Eye,
    tabActive: 'data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-500',
  },
  reservations: {
    color: 'amber',
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    Icon: CalendarClock,
    tabActive: 'data-[state=active]:text-amber-700 data-[state=active]:border-amber-500',
  },
  stock: {
    color: 'red',
    bg: 'bg-red-50',
    border: 'border-l-red-500',
    badgeBg: 'bg-red-100 text-red-700 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    Icon: PackageX,
    tabActive: 'data-[state=active]:text-red-700 data-[state=active]:border-red-500',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Summary stat card
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  count, label, theme, href,
}: { count: number; label: string; theme: keyof typeof themes; href: string }) {
  const t = themes[theme];
  const IconComp = t.Icon;
  return (
    <Link href={href}>
      <div className={cn(
        'rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        count > 0 ? `${t.bg} border-${t.color}-200` : 'bg-white border-slate-100'
      )}>
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shadow-sm', count > 0 ? t.iconBg : 'bg-slate-100')}>
          <IconComp className={cn('h-5 w-5', count > 0 ? t.iconColor : 'text-slate-400')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-2xl font-bold', count > 0 ? `text-${t.color}-700` : 'text-slate-400')}>{count}</p>
          <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        </div>
        {count > 0 && (
          <div className={cn('h-2 w-2 rounded-full animate-pulse', `bg-${t.color}-500`)} />
        )}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification row card
// ─────────────────────────────────────────────────────────────────────────────
function NotifCard({
  theme, icon: IconComp, title, subtitle, actions, rightBadge,
}: {
  theme: keyof typeof themes;
  icon?: React.ElementType;
  title: string;
  subtitle: string;
  actions: React.ReactNode;
  rightBadge?: React.ReactNode;
}) {
  const t = themes[theme];
  const Icon = IconComp || t.Icon;
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-l-4 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex items-center gap-4',
      t.border
    )}>
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', t.iconBg)}>
        <Icon className={cn('h-5 w-5', t.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      {rightBadge && <div className="shrink-0">{rightBadge}</div>}
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ icon: IconComp, message, sub }: { icon: React.ElementType; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <IconComp className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-600 mb-1">{message}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
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
          <p className="text-muted-foreground mt-1">
            Alertes opérationnelles en temps réel pour votre boutique
          </p>
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
        <StatCard count={commandes?.length ?? 0} label="En attente"        theme="commandes"    href="#commandes" />
        <StatCard count={verres?.length ?? 0}    label="Verres Prêts"      theme="verres"       href="#verres" />
        <StatCard count={reservations?.length ?? 0} label="Réservations"   theme="reservations" href="#reservations" />
        <StatCard count={stock?.length ?? 0}     label="Stock Critique"    theme="stock"        href="#stock" />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="commandes" className="w-full">
        <TabsList className="w-full justify-start h-auto bg-white border border-slate-200 p-1 rounded-2xl gap-1">

          <TabsTrigger value="commandes" className="rounded-xl gap-2 flex-1 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">En attente</span>
            {(commandes?.length ?? 0) > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {commandes?.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="verres" className="rounded-xl gap-2 flex-1 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Verres Prêts</span>
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
            <span className="hidden sm:inline">Stock Critique</span>
            {(stock?.length ?? 0) > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {stock?.length}
              </span>
            )}
          </TabsTrigger>

        </TabsList>

        {/* ── COMMANDES EN ATTENTE ── */}
        <TabsContent value="commandes" className="mt-6">
          <div className="space-y-3">
            {!commandes || commandes.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="Aucune commande en attente" sub="Toutes les commandes de verres ont été réceptionnées." />
            ) : (
              commandes.map((o: any) => (
                <NotifCard
                  key={o.id}
                  theme="commandes"
                  icon={ShoppingCart}
                  title={o.client?.fullName || 'Client inconnu'}
                  subtitle={`${o.lensType || 'Verre'} • ${parseFloat(o.sellingPrice || '0').toFixed(2)} MAD`}
                  actions={
                    <>
                      <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
                        <Link href="/dashboard/suppliers">
                          Réceptionner <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <Link href={`/dashboard/clients/${o.client?.id}`}>Dossier</Link>
                      </Button>
                    </>
                  }
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* ── VERRES PRÊTS ── */}
        <TabsContent value="verres" className="mt-6">
          <div className="space-y-3">
            {!verres || verres.length === 0 ? (
              <EmptyState icon={Eye} message="Aucun verre prêt à livrer" sub="Les verres reçus et prêts pour facturation apparaîtront ici." />
            ) : (
              verres.map((o: any) => (
                <NotifCard
                  key={o.id}
                  theme="verres"
                  icon={Eye}
                  title={o.client?.fullName || 'Client inconnu'}
                  subtitle={`${o.lensType || 'Verre'} • ${parseFloat(o.sellingPrice || '0').toFixed(2)} MAD`}
                  rightBadge={
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                      Prêt ✓
                    </Badge>
                  }
                  actions={
                    <>
                      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                        <Link href={`/dashboard/clients/${o.client?.id}?tab=sales`}>
                          Livrer au POS <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <Link href={`/dashboard/clients/${o.client?.id}`}>Dossier</Link>
                      </Button>
                    </>
                  }
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* ── RÉSERVATIONS ── */}
        <TabsContent value="reservations" className="mt-6">
          <div className="space-y-3">
            {!reservations || reservations.length === 0 ? (
              <EmptyState icon={CalendarClock} message="Aucune réservation expirant bientôt" sub="Les réservations qui expirent dans les 7 prochains jours apparaîtront ici." />
            ) : (
              reservations.map((r: any) => {
                const daysLeft = differenceInDays(new Date(r.expiryDate), new Date());
                const urgency =
                  daysLeft <= 0 ? { label: 'Expiré!', className: 'bg-red-600 text-white' }
                  : daysLeft <= 1 ? { label: 'Demain', className: 'bg-orange-500 text-white' }
                  : daysLeft <= 3 ? { label: `${daysLeft}j`, className: 'bg-amber-500 text-white' }
                  : { label: `${daysLeft}j`, className: 'bg-slate-100 text-slate-700' };
                return (
                  <NotifCard
                    key={r.id}
                    theme="reservations"
                    icon={User}
                    title={r.clientName}
                    subtitle={`Expire le ${new Date(r.expiryDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    rightBadge={
                      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold', urgency.className)}>
                        {urgency.label}
                      </span>
                    }
                    actions={
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs border-amber-200 hover:bg-amber-50 hover:text-amber-700">
                        <Link href={`/dashboard/clients/${r.clientId}?tab=reservations`}>
                          Voir Dossier <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    }
                  />
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── STOCK CRITIQUE ── */}
        <TabsContent value="stock" className="mt-6">
          <div className="space-y-3">
            {!stock || stock.length === 0 ? (
              <EmptyState icon={Package} message="Stock en bonne santé" sub="Aucun produit en dessous du seuil d'alerte." />
            ) : (
              stock.map((p: any) => {
                const isRupture = Number(p.quantiteStock) <= 0;
                return (
                  <NotifCard
                    key={p.id}
                    theme="stock"
                    icon={isRupture ? PackageX : AlertTriangle}
                    title={p.nom}
                    subtitle={`Réf: ${p.reference || '---'}`}
                    rightBadge={
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold',
                        isRupture ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'
                      )}>
                        {isRupture ? 'Rupture' : `Stock: ${p.quantiteStock}`}
                      </span>
                    }
                    actions={
                      <Button asChild size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                        <Link href={`/produits/${p.id}`}>
                          Commander <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    }
                  />
                );
              })
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
