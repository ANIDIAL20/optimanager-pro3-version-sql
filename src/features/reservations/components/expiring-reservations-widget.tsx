'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight, User, Package } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FrameReservation } from '../types/reservation.types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ExpiringReservationsWidgetProps {
  reservations: FrameReservation[];
  totalPending?: number; // Total active reservations
}

export function ExpiringReservationsWidget({
  reservations,
  totalPending,
}: ExpiringReservationsWidgetProps) {
  // Filter for pending reservations expiring in the next 3 days
  const expiringSoon = reservations
    .filter(r => r.status === 'PENDING')
    .map(r => ({
      ...r,
      daysLeft: differenceInDays(new Date(r.expiryDate), new Date()),
    }))
    .filter(r => r.daysLeft <= 3 && r.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  
  if (expiringSoon.length === 0 && !totalPending) return null;
  
  return (
    <Card className="border-orange-200 bg-orange-50/10 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 h-full flex flex-col">
      <CardHeader className="pb-3 bg-white/50 border-b border-orange-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-orange-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Réservations expirant bientôt
            </CardTitle>
            <CardDescription className="text-orange-600/70 font-medium">
              {totalPending || reservations.length} active{(totalPending || reservations.length) > 1 ? 's' : ''}, dont {expiringSoon.length} critique{expiringSoon.length > 1 ? 's' : ''}.
            </CardDescription>
          </div>
          {expiringSoon.length > 0 && (
            <Badge className="bg-orange-600 text-white border-none px-3 py-1 text-sm font-bold animate-pulse">
                {expiringSoon.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 flex-1">
          {expiringSoon.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground italic flex flex-col items-center gap-2">
              <Clock className="h-4 w-4 text-orange-200" />
              Aucun délai critique détecté.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-orange-100/50">
              {expiringSoon.map(res => (
                <div 
                  key={res.id} 
                  className="bg-white p-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <p className="font-bold text-slate-900 truncate text-sm">
                                {res.clientName}
                            </p>
                            <Badge 
                                variant={res.daysLeft === 0 ? 'destructive' : 'secondary'}
                                className={res.daysLeft === 0 ? "bg-red-500 text-white text-[9px] px-1.5 h-4 ml-auto" : "bg-orange-100 text-orange-700 text-[9px] px-1.5 h-4 ml-auto border-transparent"}
                            >
                                {res.daysLeft === 0 ? 'Auj.' : `${res.daysLeft} jours`}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500 text-[11px] font-medium">
                            <Package className="h-3.5 w-3.5" />
                            <span className="truncate uppercase font-bold text-slate-600">
                                {res.items.length} article{res.items.length > 1 ? 's' : ''} • {res.items[0].productName}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                        <Button 
                            size="sm" 
                            asChild
                            className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-sm h-7 px-2"
                        >
                            <Link href={`/dashboard/clients/${res.clientId}?tab=sales&reservationId=${res.id}`}>
                                Vente
                                <ChevronRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            className="h-7 text-[10px] font-bold border-orange-100 text-orange-600 hover:bg-orange-50"
                        >
                            <Link href={`/dashboard/clients/${res.clientId}`}>
                                Dossier
                            </Link>
                        </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {totalPending !== undefined && totalPending > 0 && (
          <div className="p-2 border-t bg-orange-50/30 text-[10px] text-muted-foreground flex justify-between items-center px-4">
            <span className="font-medium text-orange-800/70">{totalPending} réservation{totalPending > 1 ? 's' : ''} active{totalPending > 1 ? 's' : ''} au total</span>
            <Link href="/dashboard/clients" className="text-orange-700 font-bold hover:text-orange-800 flex items-center gap-0.5">
              Tout voir <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
