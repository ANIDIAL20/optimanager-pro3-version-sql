import { requireUser } from '@/lib/auth';
import DashboardClient from './_components/dashboard-client';

export default async function DashboardPage() {
  // Validate authentication server-side
  const user = await requireUser();
  
  return <DashboardClient user={user} />;
}
