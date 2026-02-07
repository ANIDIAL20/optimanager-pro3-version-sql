import { redirect } from 'next/navigation';

/**
 * Redirect /dashboard/admin → /admin (canonical admin route)
 */
export default function DashboardAdminRedirect() {
  redirect('/admin');
}
