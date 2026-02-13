'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FrameReservation } from '../types/reservation.types';
import Link from 'next/link';

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
    <Card className="border-orange-100 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50/50">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-bold text-orange-800">
            Réservations expirant bientôt
          </CardTitle>
          {expiringSoon.length > 0 && (
            <Badge variant="destructive" className="h-5 animate-pulse">
              {expiringSoon.length}
            </Badge>
          )}
        </div>
        <Clock className="h-4 w-4 text-orange-400" />
      </CardHeader>
      <CardContent className="pt-4 px-3 pb-3">
        {expiringSoon.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground italic">
            Aucun délai critique détecté.
          </div>
        ) : (
          <div className="space-y-3">
            {expiringSoon.map(res => (
              <div 
                key={res.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:border-orange-200 hover:bg-orange-50/10 transition-all group"
              >
                <div className="flex-1 min-w-0 pr-2 border-l-2 border-orange-500 pl-3">
                  <Link 
                    href={`/dashboard/clients/${res.clientId}?tab=reservations`}
                    className="font-bold text-sm text-slate-800 hover:text-blue-600 transition-colors block truncate"
                  >
                    {res.clientName}
                  </Link>
                  <p className="text-[11px] text-muted-foreground truncate italic">
                    {res.items.map(item => item.productName).join(', ')}
                    {' · '}
                    {res.items.length} monture{res.items.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge 
                    variant={res.daysLeft === 0 ? 'destructive' : 'secondary'}
                    className="text-[10px] px-1.5 h-5 flex items-center justify-center min-w-[35px]"
                  >
                    {res.daysLeft === 0
                      ? 'Auj.'
                      : `${res.daysLeft}j`}
                  </Badge>
                  <Link href={`/dashboard/clients/${res.clientId}?tab=sales&reservationId=${res.id}`}>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {totalPending !== undefined && totalPending > expiringSoon.length && (
          <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex justify-between items-center px-1">
            <span>{totalPending} réservation{totalPending > 1 ? 's' : ''} active{totalPending > 1 ? 's' : ''} au total</span>
            <Link href="/dashboard/clients" className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
              Voir clients <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
