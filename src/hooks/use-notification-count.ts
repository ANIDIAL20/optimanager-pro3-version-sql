import { useQuery } from '@tanstack/react-query';
import { getNotificationsCount } from '@/app/actions/notifications-actions';

/**
 * Hook personnalisé pour interroger et manipuler le compteur global des alertes.
 * Remplace l'ancien `setInterval` coûteux.
 */
export function useNotificationCount() {
  const STALE_TIME = 2 * 60 * 1000; // La donnée est considérée "fraîche" pendant 2 minutes

  return useQuery({
    queryKey: ['notifications', 'count'], // Clé unique pour invalider le cache partout
    queryFn: async () => {
      const res = await getNotificationsCount();
      if (!res.success) {
        throw new Error(res.error || "Impossible de récupérer le compteur");
      }
      // On retourne l'objet data défini { total, commandesEnAttente, ... }
      return res.data;
    },
    // Polling optimiste et transparent
    refetchInterval: STALE_TIME,
    staleTime: STALE_TIME,
    // Rafraîchir lorsque l'onglet reprend le focus
    refetchOnWindowFocus: true,
  });
}
