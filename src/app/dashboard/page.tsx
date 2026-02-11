import { requireUser } from '@/lib/auth-helpers';
import DashboardClient from './_components/dashboard-client';
import { getClientUsageStats } from '@/app/actions/adminActions';

export default async function DashboardPage() {
  // Validate authentication server-side
  const user = await requireUser();
  const usage = await getClientUsageStats(user.id);
  
  return <DashboardClient user={user} usage={usage} />;
}
