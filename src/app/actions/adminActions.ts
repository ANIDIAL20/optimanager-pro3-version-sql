'use server';

import { requireAdmin } from '@/lib/admin-utils';
import { revalidatePath } from 'next/cache';

// TODO: These admin actions need to be refactored to use Drizzle
// For now, returning stub responses to unblock the build

export type ClientData = {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  status: 'active' | 'suspended' | 'frozen';
  plan: 'monthly' | 'yearly' | 'trial';
  pricingTier?: 'starter' | 'professional' | 'enterprise' | 'custom';
  subscriptionEndDate: string;
  lastLogin?: string;
  revenue: number;
};

export type SaaSStats = {
  totalRevenue: number;
  activeClients: number;
  suspendedClients: number;
  newSignups: number;
  churnRate: number;
};

export async function getSystemLogs(limitCount = 20) {
  await requireAdmin();
  return [];
}

export async function createClient(formData: FormData) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function resetClientPassword(uid: string, newPassword: string) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function getFinancialStats() {
  return getSaaSStats();
}

export async function getSaaSStats() {
  await requireAdmin();
  return {
    totalRevenue: 0,
    activeClients: 0,
    suspendedClients: 0,
    newSignups: 0,
    churnRate: 0,
  } as SaaSStats;
}

export async function getAllClients() {
  await requireAdmin();
  return [];
}

export async function toggleClientStatus(uid: string, currentStatus: ClientData['status']) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function extendSubscription(uid: string, period: 'monthly' | 'yearly') {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function updateClientPlan(uid: string, data: { expiryDate: Date, gracePeriod: number, status: 'active' | 'suspended' | 'frozen' }) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function updateClientQuotas(uid: string, quotas: { maxProducts: number, maxTeamMembers: number, maxStorage: number }) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function deleteClient(uid: string) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function updateGlobalBanner(data: { message: string, type: 'info' | 'warning' | 'critical', active: boolean }) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
}

export async function getGlobalBanner() {
  // This is called from layout, so don't require admin
  return null;
}

export async function getClientUsageStats(uid: string) {
  await requireAdmin();
  return { products: 0, teamMembers: 0, storageMB: 0 };
}
