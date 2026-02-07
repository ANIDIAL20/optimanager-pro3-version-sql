'use server';

import { requireAdmin } from '@/lib/admin-utils';
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

export async function getSystemLogs(limitCount = 20) {
  await requireAdmin();
  return [];
}

export async function createClient(formData: FormData) {
  try {
    await requireAdmin();

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
}

export async function resetClientPassword(uid: string, newPassword: string) {
  await requireAdmin();
  return { success: false, error: "Admin features not yet migrated to Drizzle", message: "" };
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
  return { success: false, error: "Admin features not yet migrated to Drizzle", message: "" }; // Type compatibility
}

export async function updateClientQuotas(
    uid: string, 
    data: { 
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
    }
) {
  try {
    await requireAdmin();

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
  try {
    // Run all 4 queries in parallel for faster response
    const [productCountResult, clientCountResult, supplierCountResult, user] = await Promise.all([
      db.select({ count: count() }).from(products).where(eq(products.userId, uid)),
      db.select({ count: count() }).from(clients).where(eq(clients.userId, uid)),
      db.select({ count: count() }).from(suppliers).where(eq(suppliers.userId, uid)),
      db.query.users.findFirst({
        where: eq(users.id, uid),
        columns: { maxProducts: true, maxClients: true, maxSuppliers: true },
      }),
    ]);

    const productCount = productCountResult[0]?.count || 0;
    const clientCount = clientCountResult[0]?.count || 0;
    const supplierCount = supplierCountResult[0]?.count || 0;

    const maxProducts = user?.maxProducts || 50;
    const maxClients = user?.maxClients || 20;
    const maxSuppliers = user?.maxSuppliers || 10;

    return {
      products: { count: productCount, limit: maxProducts },
      clients: { count: clientCount, limit: maxClients },
      suppliers: { count: supplierCount, limit: maxSuppliers },
    };
  } catch (error) {
    console.error("Error calculating usage:", error);
    return { 
        products: { count: 0, limit: 50 },
        clients: { count: 0, limit: 20 },
        suppliers: { count: 0, limit: 10 }
    };
  }
}
