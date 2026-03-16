import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation'; // FIX: BUG 1 - needed for auth page detection
import { getNotificationsCount } from '@/app/actions/derived-alerts-actions';

/**
 * Hook personnalisé pour interroger et manipuler le compteur global des alertes.
 * Remplace l'ancien `setInterval` coûteux.
 */
// FIX: BUG 1 - Pages on which the query must NOT fire (unauthenticated routes)
const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function useNotificationCount() {
  const STALE_TIME = 2 * 60 * 1000; // La donnée est considérée "fraîche" pendant 2 minutes

  // FIX: BUG 1 - Detect auth pages so we can disable the query
  const pathname = usePathname();
  const isAuthPage = AUTH_PAGES.some(p => pathname.startsWith(p));

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
    // FIX: BUG 1 - Disable query on auth pages to prevent unauthenticated 500 errors
    enabled: !isAuthPage,
    // Polling optimiste et transparent
    refetchInterval: STALE_TIME,
    staleTime: STALE_TIME,
    // Rafraîchir lorsque l'onglet reprend le focus
    refetchOnWindowFocus: true,
  });
}
