'use server';

import { adminAction } from '@/lib/secure-action';
import { requireAdmin } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { products, users, clients, suppliers } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

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
  createdAt?: string; // Date when the client account was created
  quotas?: {
      maxProducts: number;
      maxClients: number;
      maxSuppliers: number;
  };
  gracePeriodDays?: number;
};

export type SaaSStats = {
  totalRevenue: number;
  activeClients: number;
  suspendedClients: number;
  newSignups: number;
  churnRate: number;
};

export const getSystemLogs = adminAction(async (user, limitCount = 20) => {
  return [];
});

export const createClient = adminAction(async (user, formData: FormData) => {
  try {

    const displayName = formData.get('displayName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const isActive = formData.get('isActive') === 'true';
    const limitsRaw = formData.get('limits') as string;
    
    // Financial & Dates
    const paymentMode = formData.get('paymentMode') as 'subscription' | 'lifetime' || 'subscription';
    const billingCycle = formData.get('billingCycle') as 'monthly' | 'yearly' || 'monthly';
    const agreedPrice = parseFloat(formData.get('agreedPrice') as string) || 0;
    const trainingPrice = parseFloat(formData.get('trainingPrice') as string) || 0;
    const setupPrice = parseFloat(formData.get('setupPrice') as string) || 0;
    const amountPaid = parseFloat(formData.get('amountPaid') as string) || 0;
    const installmentsCount = parseInt(formData.get('installmentsCount') as string) || 1;
    
    const lastPaymentDate = formData.get('lastPaymentDate') ? new Date(formData.get('lastPaymentDate') as string) : null;
    const nextPaymentDate = formData.get('nextPaymentDate') ? new Date(formData.get('nextPaymentDate') as string) : null;
    const subscriptionExpiry = formData.get('subscriptionExpiry') ? new Date(formData.get('subscriptionExpiry') as string) : null;

    if (!displayName || !email || !password) {
      return { success: false, error: "Champs obligatoires manquants (Nom, Email, Mot de passe)" };
    }

    // Parse limits
    let maxProducts = 50;
    let maxClients = 20;
    let maxSuppliers = 10;

    if (limitsRaw) {
        try {
            const parsed = JSON.parse(limitsRaw);
            maxProducts = parsed.maxProducts || 50;
            maxClients = parsed.maxClients || 20;
            maxSuppliers = parsed.maxSuppliers || 10;
        } catch (e) {
            console.error("Failed to parse limits JSON", e);
        }
    }

    // Check existing
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (existingUser) {
        return { success: false, error: "Un utilisateur avec cet email existe déjà." };
    }

    // Hash password
    const hashedPassword = await import('bcryptjs').then(bcrypt => bcrypt.hash(password, 10));

    // Insert User
    await db.insert(users).values({
        name: displayName,
        email: email,
        password: hashedPassword,
        role: "USER",
        isActive: isActive,
        maxProducts: maxProducts,
        maxClients: maxClients,
        maxSuppliers: maxSuppliers,
        emailVerified: new Date(),
        
        // Financial & Dates
        paymentMode,
        billingCycle,
        agreedPrice: agreedPrice.toString(),
        trainingPrice: trainingPrice.toString(),
        setupPrice: setupPrice.toString(),
        amountPaid: amountPaid.toString(),
        installmentsCount,
        lastPaymentDate,
        nextPaymentDate,
        subscriptionExpiry,
    });

    revalidatePath('/dashboard/admin');
    return { success: true, message: "Client créé avec succès !" };

  } catch (error: any) {
    console.error("Error creating client:", error);
    return { success: false, error: "Erreur serveur: " + error.message };
  }
});

export const resetClientPassword = adminAction(async (user, uid: string, newPassword: string) => {
  return { success: false, error: "Admin features not yet migrated to Drizzle", message: "" };
});

export async function getFinancialStats() {
  return getSaaSStats();
}

import { unstable_cache } from 'next/cache';

export const getSaaSStats = adminAction(async (user) => {
  return await unstable_cache(
    async () => {
      console.log('🔄 Fetching SaaS Stats (Cached)...');
      const [allUsers, shopOwners] = await Promise.all([
        db.select().from(users),
        db.select().from(users).where(eq(users.role, 'USER'))
      ]);

      const activeClients = shopOwners.filter((u: any) => u.isActive).length;
      const totalRevenue = shopOwners.reduce((sum: number, u: any) => sum + parseFloat(u.amountPaid || '0'), 0);

      return {
        totalRevenue,
        activeClients,
        suspendedClients: shopOwners.length - activeClients,
        newSignups: shopOwners.length,
        churnRate: 2.4, // Keep mock for now as we don't have churn data
      } as SaaSStats;
    },
    ['saas-stats'],
    { revalidate: 3600, tags: ['admin-stats'] }
  )();
});

export const getAllClients = adminAction(async (user) => {
  const allUsers = await db.select().from(users).where(eq(users.role, 'USER'));
  
  return allUsers.map((u: any) => ({
    uid: u.id,
    email: u.email,
    displayName: u.name || 'Shop Owner',
    phoneNumber: '', 
    status: u.isActive ? 'active' : 'suspended',
    subscriptionEndDate: u.subscriptionExpiry?.toISOString() || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    plan: u.billingCycle || 'monthly',
    revenue: parseFloat(u.amountPaid || '0'),
    quotas: {
        maxProducts: u.maxProducts,
        maxClients: u.maxClients,
        maxSuppliers: u.maxSuppliers
    }
  })) as ClientData[];
});

export const toggleClientStatus = adminAction(async (user, uid: string, currentStatus: ClientData['status']) => {
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
});

export const extendSubscription = adminAction(async (user, uid: string, period: 'monthly' | 'yearly') => {
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
});

export const updateClientPlan = adminAction(async (user, uid: string, data: { expiryDate: Date, gracePeriod: number, status: 'active' | 'suspended' | 'frozen' }) => {
  return { success: false, error: "Admin features not yet migrated to Drizzle", message: "" }; // Type compatibility
});

export const updateClientQuotas = adminAction(async (user, uid: string, data: { 
    maxProducts: number, 
    maxClients: number, 
    maxSuppliers: number, 
    status?: 'active' | 'suspended' | 'frozen', 
    
    // Dates
    lastPaymentDate?: Date | undefined,
    nextPaymentDate?: Date | undefined,
    expiryDate?: Date | undefined,
    
    // Finance
    paymentMode?: 'subscription' | 'lifetime',
    billingCycle?: 'monthly' | 'yearly',
    agreedPrice?: number,
    trainingPrice?: number,
    setupPrice?: number,
    amountPaid?: number,
    installmentsCount?: number,
    nextInstallmentDate?: Date | undefined
}) => {
  try {

    const updateData: any = {
        maxProducts: data.maxProducts,
        maxClients: data.maxClients,
        maxSuppliers: data.maxSuppliers,
        updatedAt: new Date(),
    };

    if (data.status) updateData.isActive = data.status === 'active';
    
    // Dates
    if (data.lastPaymentDate !== undefined) updateData.lastPaymentDate = data.lastPaymentDate;
    if (data.nextPaymentDate !== undefined) updateData.nextPaymentDate = data.nextPaymentDate;
    if (data.expiryDate !== undefined) updateData.subscriptionExpiry = data.expiryDate;
    
    // Finance
    if (data.paymentMode) updateData.paymentMode = data.paymentMode;
    if (data.billingCycle) updateData.billingCycle = data.billingCycle;
    if (data.agreedPrice !== undefined) updateData.agreedPrice = data.agreedPrice.toString();
    if (data.trainingPrice !== undefined) updateData.trainingPrice = data.trainingPrice.toString();
    if (data.setupPrice !== undefined) updateData.setupPrice = data.setupPrice.toString();
    if (data.amountPaid !== undefined) updateData.amountPaid = data.amountPaid.toString();
    if (data.installmentsCount !== undefined) updateData.installmentsCount = data.installmentsCount;
    if (data.nextInstallmentDate !== undefined) updateData.nextInstallmentDate = data.nextInstallmentDate;

    await db.update(users)
        .set(updateData)
        .where(eq(users.id, uid));

    revalidatePath('/dashboard/admin');
    return { success: true, message: "Compte mis à jour avec succès" };

  } catch (error: any) {
    console.error("Error updating client:", error);
    return { success: false, error: "Erreur lors de la mise à jour: " + error.message };
  }
});

export const deleteClient = adminAction(async (user, uid: string) => {
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
});

export const updateGlobalBanner = adminAction(async (user, data: { message: string, type: 'info' | 'warning' | 'critical', active: boolean }) => {
  return { success: false, error: "Admin features not yet migrated to Drizzle" };
});

export async function getGlobalBanner() {
  // This is called from layout, so don't require admin
  return null;
}

export async function getClientUsageStats(uid: string) {
  if (!uid) return { 
    products: { count: 0, limit: 50 }, 
    clients: { count: 0, limit: 20 }, 
    suppliers: { count: 0, limit: 10 } 
  };

  try {
    const trimmedId = uid.trim();
    console.log(`📊 Fetching usage stats for UID: ${trimmedId}`);
    
    // ✅ Parallel Drizzle queries (Option 3 Recommendation)
    const [productsRes, clientsRes, suppliersRes, userRes] = await Promise.all([
      db.select({ value: count() }).from(products).where(eq(products.userId, trimmedId)),
      db.select({ value: count() }).from(clients).where(eq(clients.userId, trimmedId)),
      db.select({ value: count() }).from(suppliers).where(eq(suppliers.userId, trimmedId)),
      db.query.users.findFirst({
        where: eq(users.id, trimmedId),
        columns: { maxProducts: true, maxClients: true, maxSuppliers: true },
      })
    ]);

    return {
      products: { 
        count: Number(productsRes[0]?.value || 0), 
        limit: userRes?.maxProducts || 50 
      },
      clients: { 
        count: Number(clientsRes[0]?.value || 0), 
        limit: userRes?.maxClients || 20 
      },
      suppliers: { 
        count: Number(suppliersRes[0]?.value || 0), 
        limit: userRes?.maxSuppliers || 10 
      },
    };
  } catch (error: any) {
    console.error("❌ Usage Stats Error:", error);
    return { 
        products: { count: 0, limit: 50 },
        clients: { count: 0, limit: 20 },
        suppliers: { count: 0, limit: 10 }
    };
  }
}
