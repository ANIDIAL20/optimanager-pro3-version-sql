'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function NotificationsWrapper() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { toast } = useToast();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LENS_ORDER_PENDING':
        return <div className="p-1.5 bg-orange-100 rounded-full"><Clock className="h-4 w-4 text-orange-600" /></div>;
      case 'LOW_STOCK':
        return <div className="p-1.5 bg-red-100 rounded-full"><AlertTriangle className="h-4 w-4 text-red-600" /></div>;
      case 'RESERVATION_EXPIRING':
      case 'RESERVATION_EXPIRED':
        return <div className="p-1.5 bg-amber-100 rounded-full"><Clock className="h-4 w-4 text-amber-600" /></div>;
      case 'LENS_READY':
        return <div className="p-1.5 bg-emerald-100 rounded-full"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>;
      default:
        return <div className="p-1.5 bg-blue-100 rounded-full"><Bell className="h-4 w-4 text-blue-600" /></div>;
    }
  };

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer comme lu',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: 'Notifications lues',
        description: 'Toutes les notifications ont été marquées comme lues',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer toutes comme lues',
        variant: 'destructive',
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                    !notification.read && 'bg-muted/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 mb-0.5">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      
                      {/* Actions Rapides dynamiques */}
                      {notification.type === 'LENS_ORDER_PENDING' && (
                        <Button asChild variant="secondary" size="sm" className="h-6 text-[10px] px-2 mt-1" onClick={() => setIsOpen(false)}>
                          <Link href="/dashboard/suppliers">Réceptionner →</Link>
                        </Button>
                      )}
                      {notification.type === 'LENS_READY' && notification.relatedEntityId && (
                        <Button asChild variant="secondary" size="sm" className="h-6 text-[10px] px-2 mt-1" onClick={() => setIsOpen(false)}>
                          <Link href={`/dashboard/clients`}>Livrer →</Link>
                        </Button>
                      )}
                      
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          // Handle dismiss if needed
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
