'use server';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { verifySuperAdmin } from '@/lib/admin-utils';
import { Resend } from 'resend';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_for_build");

const PRICING = {
  starter: { monthly: 200, yearly: 2000 },
  professional: { monthly: 400, yearly: 4000 },
  enterprise: { monthly: 800, yearly: 8000 }
};

export type ClientData = {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  status: 'active' | 'suspended' | 'frozen';
  plan: 'monthly' | 'yearly' | 'trial'; // Keep for backward compatibility
  
  // 🆕 DUAL-COMPONENT PRICING SYSTEM
  pricingTier?: 'starter' | 'professional' | 'enterprise' | 'custom';
  
  // App License Component
  appLicenseEnabled?: boolean;
  appLicenseAmount?: number;
  appLicenseType?: 'one-time' | 'annual';
  
  // Subscription Component
  subscriptionEnabled?: boolean;
  subscriptionAmount?: number;
  subscriptionCycle?: 'monthly' | 'yearly';
  
  // Payment dates
  nextPaymentDate?: string; // ISO String - Custom payment date
  
  // Trial
  trialEnabled?: boolean;
  trialDays?: number;
  
  // Features & Limits
  features?: string[];
  limits?: {
    maxUsers: number;
    maxClients: number;
    maxStorageGB: number;
  };
  
  subscriptionEndDate: string; // ISO String
  lastLogin?: string; // ISO String
  revenue: number; // Calculated revenue from this user
  quotas?: {
    maxProducts: number;
    maxTeamMembers: number;
    maxStorage: number;
  };
  gracePeriodDays?: number;
};

export type SaaSStats = {
  totalRevenue: number; // MRR or Total Value
  activeClients: number;
  suspendedClients: number;
  newSignups: number;
  churnRate: number;
};

// ... imports

// Helper for Logging
async function logSystemAction(action: string, targetUid: string, details: string) {
  try {
    await verifySuperAdmin();
    await adminDb.collection('system_logs').add({
      timestamp: Timestamp.now(),
      action,
      targetUid,
      adminEmail: 'Super Admin',
      details
    });
  } catch (e) {
    console.error("Failed to log action:", e);
  }
}

export async function getSystemLogs(limitCount = 20) {
  await verifySuperAdmin();
  const snap = await adminDb.collection('system_logs').orderBy('timestamp', 'desc').limit(limitCount).get();
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    timestamp: d.data().timestamp.toDate ? d.data().timestamp.toDate().toISOString() : new Date().toISOString()
  }));
}

// --- Actions ---

export async function createClient(formData: FormData) {
  try {
    await verifySuperAdmin();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;
    const plan = formData.get('plan') as string;
    const phoneNumber = formData.get('phoneNumber') as string;

    if (!email || !plan || !password || !displayName) {
      return { success: false, error: "Email, Mot de passe, Nom et Plan sont requis." };
    }

    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: email,
        password: password,
        displayName: displayName,
        phoneNumber: phoneNumber || undefined,
        emailVerified: true,
      });
    } catch (authError: any) {
      // Retry without phone number if that was the cause
      if (authError.code === 'auth/invalid-phone-number' && phoneNumber) {
        console.warn("Retrying creation without phone number due to invalid format.");
        userRecord = await adminAuth.createUser({
          email: email,
          password: password,
          displayName: displayName,
          emailVerified: true,
        });
      } else {
        throw authError;
      }
    }

    const now = new Date();
    const expiryDate = new Date();
    if (plan === 'trial') expiryDate.setDate(expiryDate.getDate() + 15);
    else if (plan === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
    else if (plan === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    await adminDb.collection('clients').doc(userRecord.uid).set({
      role: 'admin',
      displayName: displayName,
      email: email,
      phoneNumber: phoneNumber || null,
      status: 'active',
      plan: plan.toLowerCase(),
      subscriptionStartDate: Timestamp.fromDate(now),
      subscriptionEndDate: Timestamp.fromDate(expiryDate),
      lastLogin: null,
      authMethod: 'Email',
      createdAt: Timestamp.fromDate(now),
    });

    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'OptiManager Pro <onboarding@resend.dev>',
          to: email,
          subject: 'Bienvenue sur OptiManager Pro 👓',
          html: `<p>Bonjour <strong>${displayName}</strong>,</p><p>Votre compte a été créé.</p><p>Email: ${email}</p><p>Mot de passe: <strong>${password}</strong></p><p>Lien: <a href="https://optimanager-pro-3.web.app">Accéder au Dashboard</a></p>`
        });
      } catch (e) { console.error("Email send failed", e); }
    }

    await logSystemAction('CREATE_CLIENT', userRecord.uid, `Created client: ${email} with plan ${plan}`);

    revalidatePath('/admin');
    return { success: true, message: 'Client ajouté avec succès.' };
  } catch (error: any) {
    console.error('Error creating client:', error);
    return { success: false, error: error.message };
  }
}

export async function resetClientPassword(uid: string, newPassword: string) {
  try {
    await verifySuperAdmin();
    await adminAuth.updateUser(uid, { password: newPassword });
    return { success: true, message: 'Mot de passe réinitialisé.' };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }
}

export async function getFinancialStats() {
  // Alias to getSaaSStats for now as it calculates the same MRR
  return getSaaSStats();
}

export async function getSaaSStats() {
  await verifySuperAdmin();

  try {
    const snapshot = await adminDb.collection('clients').get();
    const clients = snapshot.docs.map(doc => doc.data());

    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const suspendedClients = clients.filter(c => c.status === 'suspended').length;

    // New Signups (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newSignups = clients.filter(c => {
      const created = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      return created > thirtyDaysAgo;
    }).length;

    // Revenue Calculation (MRR Estimation with new pricing tiers)
    let totalRevenue = 0;
    clients.forEach(c => {
      if (c.status === 'active') {
        // New pricing tier logic
        if (c.pricingTier && c.pricingTier !== 'custom') {
          const tier = c.pricingTier as keyof typeof PRICING;
          const monthlyPrice = c.billingCycle === 'yearly' 
            ? Math.round(PRICING[tier].yearly / 12)
            : PRICING[tier].monthly;
          totalRevenue += monthlyPrice;
        } else if (c.customPrice) {
          const monthlyPrice = c.billingCycle === 'yearly' 
            ? Math.round(c.customPrice / 12)
            : c.customPrice;
          totalRevenue += monthlyPrice;
        } else {
          // Legacy fallback for old clients
          if (c.plan === 'monthly') totalRevenue += PRICING.professional.monthly;
          if (c.plan === 'yearly') totalRevenue += Math.round(PRICING.professional.yearly / 12);
        }
      }
    });

    // Churn Rate (Suspended / Total) * 100
    const churnRate = totalClients > 0 ? (suspendedClients / totalClients) * 100 : 0;

    // Chart Data: Signups (Last 6 Months)
    const chartDataMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short' });
      chartDataMap.set(key, 0);
    }

    clients.forEach(c => {
      if (c.createdAt) {
        const d = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        // simple check if within last ~6 months window
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (d > sixMonthsAgo) {
          const key = d.toLocaleString('default', { month: 'short' });
          if (chartDataMap.has(key)) {
            chartDataMap.set(key, chartDataMap.get(key) + 1);
          }
        }
      }
    });

    const chartData = Array.from(chartDataMap.entries()).map(([name, signups]) => ({ name, signups }));

    return {
      totalRevenue,
      activeClients,
      suspendedClients,
      newSignups,
      churnRate: Math.round(churnRate * 10) / 10,
      chartData // Added for Graph
    } as SaaSStats | any;

  } catch (error) {
    console.error("Error getting stats:", error);
    throw new Error("Failed to fetch stats");
  }
}

// ... (previous code)

export async function getAllClients() {
  await verifySuperAdmin();
  const snapshot = await adminDb.collection('clients').orderBy('createdAt', 'desc').get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    let endDate = 'N/A';
    if (data.subscriptionEndDate?.toDate) {
      endDate = data.subscriptionEndDate.toDate().toISOString();
    } else if (data.expires) {
      // legacy fallback
      endDate = data.expires;
    }

    // Calculate revenue based on new pricing model
    let revenue = 0;
    if (data.pricingTier && data.pricingTier !== 'custom') {
      const tier = data.pricingTier as keyof typeof PRICING;
      const cycle = (data.billingCycle || 'monthly') as 'monthly' | 'yearly';
      revenue = PRICING[tier]?.[cycle] || 0;
    } else if (data.customPrice) {
      revenue = data.customPrice;
    } else {
      // Fallback to legacy plan field
      revenue = data.plan === 'yearly' ? PRICING.professional.yearly : 
                data.plan === 'monthly' ? PRICING.professional.monthly : 0;
    }

    return {
      uid: doc.id,
      email: data.email,
      displayName: data.displayName || 'Opticien',
      phoneNumber: data.phoneNumber || 'N/A',
      status: data.status,
      plan: data.plan || 'trial',
      
      // 🆕 DUAL-COMPONENT PRICING
      pricingTier: data.pricingTier,
      appLicenseEnabled: data.appLicenseEnabled || false,
      appLicenseAmount: data.appLicenseAmount || 0,
      appLicenseType: data.appLicenseType || 'one-time',
      subscriptionEnabled: data.subscriptionEnabled || false,
      subscriptionAmount: data.subscriptionAmount || 0,
      subscriptionCycle: data.subscriptionCycle || 'monthly',
      nextPaymentDate: data.nextPaymentDate?.toDate ? data.nextPaymentDate.toDate().toISOString() : null,
      trialEnabled: data.trialEnabled,
      trialDays: data.trialDays,
      features: data.features || [],
      limits: data.limits || getDefaultLimits(data.pricingTier || 'professional'),
      
      subscriptionEndDate: endDate,
      lastLogin: data.lastLogin?.toDate ? data.lastLogin.toDate().toISOString() : null,
      revenue: revenue,
      quotas: data.quotas || { maxProducts: 500, maxTeamMembers: 2, maxStorage: 1 },
      gracePeriodDays: data.gracePeriodDays || 3
    } as ClientData;
  });
}

// --- Actions ---

export async function toggleClientStatus(uid: string, currentStatus: ClientData['status']) {
  try {
    await verifySuperAdmin();
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    await adminDb.collection('clients').doc(uid).update({
      status: newStatus
    });

    // Sync Auth status
    // If new status is active, disabled = false
    const disabled = newStatus !== 'active';
    await adminAuth.updateUser(uid, { disabled });

    await logSystemAction('TOGGLE_STATUS', uid, `Changed status to ${newStatus}`);

    revalidatePath('/admin');
    return { success: true, message: `Statut mis à jour : ${newStatus === 'active' ? 'Actif' : 'Suspendu'}` };
  } catch (error: any) {
    console.error("Error toggling status:", error);
    return { success: false, error: error.message };
  }
}

export async function extendSubscription(uid: string, period: 'monthly' | 'yearly') {
  try {
    await verifySuperAdmin();

    // Fetch current client to get current end date
    const clientDoc = await adminDb.collection('clients').doc(uid).get();
    if (!clientDoc.exists) throw new Error("Client not found");

    const clientData = clientDoc.data() as ClientData;

    // Determine start date for extension (either now or current end date if in future)
    let startDate = new Date();
    if (clientData.subscriptionEndDate) {
      // Handle both Timestamp and string formats safely
      const currentEnd = (clientData.subscriptionEndDate as any).toDate
        ? (clientData.subscriptionEndDate as any).toDate()
        : new Date(clientData.subscriptionEndDate);

      if (currentEnd > startDate) {
        startDate = currentEnd;
      }
    }

    const newEndDate = new Date(startDate);
    if (period === 'monthly') newEndDate.setMonth(newEndDate.getMonth() + 1);
    else if (period === 'yearly') newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    await adminDb.collection('clients').doc(uid).update({
      subscriptionEndDate: Timestamp.fromDate(newEndDate),
      status: 'active' // Auto-reactivate if expired
    });

    // Ensure user is enabled in Auth
    await adminAuth.updateUser(uid, { disabled: false });

    await logSystemAction('EXTEND_SUBSCRIPTION', uid, `Extended ${period} until ${newEndDate.toISOString()}`);

    revalidatePath('/admin');
    return { success: true, message: `Abonnement prolongé jusqu'au ${newEndDate.toLocaleDateString()}` };
  } catch (error: any) {
    console.error("Error extending subscription:", error);
    return { success: false, error: error.message };
  }
}

export async function updateClientPlan(uid: string, data: { expiryDate: Date, gracePeriod: number, status: 'active' | 'suspended' | 'frozen' }) {
  try {
    await verifySuperAdmin();

    await adminDb.collection('clients').doc(uid).update({
      subscriptionEndDate: Timestamp.fromDate(data.expiryDate),
      gracePeriodDays: data.gracePeriod,
      status: data.status
    });

    // Sync Auth status
    const disabled = data.status === 'suspended' || data.status === 'frozen';
    await adminAuth.updateUser(uid, { disabled });

    await logSystemAction('UPDATE_PLAN', uid, `Status: ${data.status}, Grace: ${data.gracePeriod}`);

    revalidatePath('/admin');
    return { success: true, message: 'Plan mis à jour avec succès.' };
  } catch (error: any) {
    console.error("Error updating plan:", error);
    return { success: false, error: error.message };
  }
}

export async function updateClientQuotas(uid: string, quotas: { maxProducts: number, maxTeamMembers: number, maxStorage: number }) {
  try {
    await verifySuperAdmin();

    await adminDb.collection('clients').doc(uid).update({
      quotas: quotas
    });

    await logSystemAction('UPDATE_QUOTAS', uid, `Prod: ${quotas.maxProducts}, Team: ${quotas.maxTeamMembers}`);

    revalidatePath('/admin');
    return { success: true, message: 'Quotas mis à jour avec succès.' };
  } catch (error: any) {
    console.error("Error updating quotas:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteClient(uid: string) {
  try {
    await verifySuperAdmin();

    await adminAuth.deleteUser(uid);
    await adminDb.collection('clients').doc(uid).delete();

    await logSystemAction('DELETE_CLIENT', uid, 'Deleted client and all data');

    revalidatePath('/admin');
    return { success: true, message: 'Client définitivement supprimé.' };
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }
}

// --- Global Banner Actions ---

export async function updateGlobalBanner(data: { message: string, type: 'info' | 'warning' | 'critical', active: boolean }) {
  try {
    await verifySuperAdmin();
    await adminDb.collection('system_settings').doc('global_banner').set(data);

    await logSystemAction('UPDATE_BANNER', 'SYSTEM', `Banner active: ${data.active}, type: ${data.type}`);

    revalidatePath('/'); // Revalidate everywhere
    return { success: true, message: 'Bannière mise à jour.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGlobalBanner() {
  try {
    const doc = await adminDb.collection('system_settings').doc('global_banner').get();
    return doc.exists ? doc.data() as { message: string, type: 'info' | 'warning' | 'critical', active: boolean } : null;
  } catch (error) {
    console.error("Error fetching banner:", error);
    return null;
  }
}

export async function getClientUsageStats(uid: string) {
  try {
    await verifySuperAdmin();
    const productsCount = (await adminDb.collection('products').where('storeId', '==', uid).count().get()).data().count;
    const usersCount = (await adminDb.collection('users').where('storeId', '==', uid).count().get()).data().count;

    // Mock storage usage for now or implement file size aggregation if tracking logic exists
    // Estimating 0.5MB per product for now as a rough heuristic + base 10MB
    const estimatedStorageMB = Math.round(10 + (productsCount * 0.5));

    return {
      products: productsCount,
      teamMembers: usersCount,
      storageMB: estimatedStorageMB
    };
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return { products: 0, teamMembers: 0, storageMB: 0 };
  }
}

// ========================================
// HELPER FUNCTIONS FOR ENHANCED PRICING
// ========================================

function getDefaultLimits(tier: string) {
  const limits = {
    starter: { maxUsers: 1, maxClients: 100, maxStorageGB: 1 },
    professional: { maxUsers: 3, maxClients: 500, maxStorageGB: 5 },
    enterprise: { maxUsers: 10, maxClients: 1000, maxStorageGB: 10 },
    custom: { maxUsers: 3, maxClients: 500, maxStorageGB: 5 }
  };
  return limits[tier as keyof typeof limits] || limits.professional;
}

function getPlanDisplayName(tier: string) {
  const names = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
    custom: 'Plan personnalisé'
  };
  return names[tier as keyof typeof names] || 'Professional';
}

function getFeatureDisplayName(feature: string) {
  const names = {
    inventory: 'Gestion d\'inventaire',
    reports: 'Rapports de vente',
    export: 'Export de données',
    api: 'Accès API',
    multistore: 'Multi-magasins',
    analytics: 'Analyses avancées'
  };
  return names[feature as keyof typeof names] || feature;
}
