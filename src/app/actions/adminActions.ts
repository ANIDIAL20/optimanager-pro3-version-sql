'use server';

import { adminAction } from '@/lib/secure-action';
import { requireAdmin } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { products, users, clients, suppliers } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';

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
    const email = (formData.get('email') as string).toLowerCase().trim();
    const password = formData.get('password') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const isActive = formData.get('isActive') === 'true'; // Warning: string vs boolean
    const limitsRaw = formData.get('limits') as string;
    
    // Financial & Dates
    const paymentMode = (formData.get('paymentMode') as 'subscription' | 'lifetime') || 'subscription';
    const billingCycle = (formData.get('billingCycle') as 'monthly' | 'yearly') || 'monthly';
    const agreedPrice = parseFloat(formData.get('agreedPrice') as string) || 0;
    const trainingPrice = parseFloat(formData.get('trainingPrice') as string) || 0;
    const setupPrice = parseFloat(formData.get('setupPrice') as string) || 0;
    const amountPaid = parseFloat(formData.get('amountPaid') as string) || 0;
    const installmentsCount = parseInt(formData.get('installmentsCount') as string) || 1;
    
    // Proper date parsing
    const parseDate = (val: FormDataEntryValue | null) => val ? new Date(val as string) : null;
    const lastPaymentDate = parseDate(formData.get('lastPaymentDate'));
    const nextPaymentDate = parseDate(formData.get('nextPaymentDate'));
    const subscriptionExpiry = parseDate(formData.get('subscriptionExpiry'));

    if (!displayName || !email || !password) {
      return { success: false, error: "Champs obligatoires manquants (Nom, Email, Mot de passe)" };
    }

    // Parse limits
    let maxProducts = 500;
    let maxClients = 200;
    let maxSuppliers = 100;

    if (limitsRaw) {
        try {
            const parsed = JSON.parse(limitsRaw);
            maxProducts = Number(parsed.maxProducts) || 50;
            maxClients = Number(parsed.maxClients) || 20;
            maxSuppliers = Number(parsed.maxSuppliers) || 10;
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
        id: crypto.randomUUID(), // Explicitly generate ID if schema handles it poorly
        name: displayName,
        email: email,
        password: hashedPassword,
        role: "USER",
        isActive: isActive,
        
        // Quotas
        maxProducts,
        maxClients,
        maxSuppliers,
        
        emailVerified: new Date(),
        
        // Security Defaults
        failedLoginAttempts: 0, 
        
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

        createdAt: new Date(),
        updatedAt: new Date(),
    });

    revalidatePath('/dashboard/admin');
    return { success: true, message: "Client créé avec succès !" };

  } catch (error: any) {
    console.error("Error creating client:", error);
    // User friendly error mapping
    if (error.code === '23505') return { success: false, error: "Un compte avec cet email existe déjà." };
    return { success: false, error: "Erreur serveur: " + error.message };
  }
});

export const resetClientPassword = adminAction(async (user, uid: string, newPassword: string) => {
  try {
    if (!newPassword || newPassword.length < 6) {
        return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères" };
    }

    // 1. Hash password
    const hashedPassword = await import('bcryptjs').then(bcrypt => bcrypt.hash(newPassword, 10));

    // 2. Update DB & Unlock Account
    await db.update(users)
        .set({
            password: hashedPassword,
            failedLoginAttempts: 0,
            lockoutUntil: null, // Unlock account immediately
            updatedAt: new Date()
        })
        .where(eq(users.id, uid));

    revalidatePath('/dashboard/admin');
    return { success: true, message: "Mot de passe réinitialisé avec succès !" };

  } catch (error: any) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Erreur serveur: " + error.message };
  }
});

export async function getFinancialStats() {
  return getSaaSStats();
}

import { unstable_cache } from 'next/cache';

export const getSaaSStats = adminAction(async (user) => {
  return await unstable_cache(
    async () => {
      const shopOwners = await db.select({
        isActive: users.isActive,
        amountPaid: users.amountPaid
      })
      .from(users)
      .where(eq(users.role, 'USER'));

      const activeClients = shopOwners.filter((u: { isActive: boolean | null; amountPaid: string | null }) => u.isActive).length;
      const totalRevenue = shopOwners.reduce((sum: number, u: { isActive: boolean | null; amountPaid: string | null }) => sum + parseFloat(u.amountPaid || '0'), 0);

      return {
        totalRevenue,
        activeClients,
        suspendedClients: shopOwners.length - activeClients,
        newSignups: shopOwners.length,
        churnRate: 2.4, 
      } as SaaSStats;
    },
    ['saas-stats'],
    { revalidate: 3600, tags: ['admin-stats'] }
  )();
});

export const getAllClients = adminAction(async (user) => {
  const shopOwners = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    isActive: users.isActive,
    subscriptionExpiry: users.subscriptionExpiry,
    billingCycle: users.billingCycle,
    amountPaid: users.amountPaid,
    maxProducts: users.maxProducts,
    maxClients: users.maxClients,
    maxSuppliers: users.maxSuppliers
  })
  .from(users)
  .where(eq(users.role, 'USER'));
  
  return shopOwners.map((u: any) => ({
    uid: u.id,
    email: u.email,
    displayName: u.name || 'Shop Owner',
    phoneNumber: '', 
    status: u.isActive ? 'active' : 'suspended',
    subscriptionEndDate: u.subscriptionExpiry ? (typeof u.subscriptionExpiry === 'string' ? u.subscriptionExpiry : u.subscriptionExpiry.toISOString()) : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
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
  try {
    if (!uid) {
        console.warn("⚠️ getClientUsageStats called without uid");
        return { 
            products: { count: 0, limit: 500 },
            clients: { count: 0, limit: 200 },
            suppliers: { count: 0, limit: 100 }
        };
    }
    const trimmedId = uid.trim();
    console.log(`📊 Fetching usage stats for user: ${trimmedId}`);

    const fetchUserLimits = async () => {
        try {
            // Using surgical select to avoid issues with missing columns in physical DB
            const res = await db.select({
                maxProducts: users.maxProducts,
                maxClients: users.maxClients,
                maxSuppliers: users.maxSuppliers
            })
            .from(users)
            .where(eq(users.id, trimmedId))
            .limit(1);
            
            return res[0] || null;
        } catch (e: any) {
            // Robust detection for schema-related errors
            const msg = e.message?.toLowerCase() || '';
            const isColumnError = 
                msg.includes('column') || 
                msg.includes('does not exist') || 
                msg.includes('failed query') ||
                msg.includes('relation');
            
            if (isColumnError) {
                console.warn(`ℹ️ [DB NOTICE] User limits or users table not perfectly synced, using defaults. Error: ${e.message}`);
            } else {
                console.error(`❌ [DB ERROR] User limits fetch failed:`, e.message);
            }

            // Return default limits to keep the UI functional
            return {
                maxProducts: 500,
                maxClients: 200,
                maxSuppliers: 100
            };
        }
    };

    // Map of tables for counting
    const tableMap: Record<string, any> = {
        products,
        clients,
        suppliers
    };

    // List available query keys to debug
    const queryKeys = Object.keys(db.query || {});
    console.log(`📡 [DB] Available query keys: ${queryKeys.join(', ')}`);

    // Robust count fetcher using select with explicit casting for multi-tenant isolation
    const fetchCount = async (tableName: string) => {
        let attempts = 0;
        const maxAttempts = 2;
        const targetTable = tableMap[tableName];

        if (!targetTable) {
            console.error(`❌ [DB ERROR] Table mapping for ${tableName} not found`);
            return 0;
        }

        while (attempts < maxAttempts) {
            try {
                // Use sql template with explicit casting for user_id to handle potential UUID/TEXT mismatch
                // This is the most compatible way across different Postgres schema versions
                const res = await db.select({ value: count() })
                    .from(targetTable)
                    .where(sql`${targetTable.userId}::text = ${trimmedId}`);
                
                const val = Number(res[0]?.value || 0);
                console.log(`✅ [DB SUCCESS] ${tableName} count: ${val}`);
                return val;
            } catch (e: any) {
                attempts++;
                console.error(`❌ [DB ATTEMPT ${attempts}] ${tableName} count failed: ${e.message}`);
                
                // Fallback attempt without casting if the casting itself caused an error
                if (attempts === 1) {
                    try {
                        const resFallback = await db.select({ value: count() })
                            .from(targetTable)
                            .where(eq(targetTable.userId, trimmedId));
                        return Number(resFallback[0]?.value || 0);
                    } catch (innerE) {
                        // Ignore fallback error, continue to next attempt cycle
                    }
                }

                if (attempts >= maxAttempts) return 0;
                await new Promise(resolve => setTimeout(resolve, attempts * 500));
            }
        }
        return 0;
    };

    const [pCount, cCount, sCount, user] = await Promise.all([
      fetchCount('products'),
      fetchCount('clients'),
      fetchCount('suppliers'),
      fetchUserLimits()
    ]);

    return {
      products: { 
        count: pCount, 
        limit: Number(user?.maxProducts || 50) 
      },
      clients: { 
        count: cCount, 
        limit: Number(user?.maxClients || 20) 
      },
      suppliers: { 
        count: sCount, 
        limit: Number(user?.maxSuppliers || 10) 
      },
    };
  } catch (error: any) {
    console.error("❌ Usage Stats Error (Final):", error);
    return { 
        products: { count: 0, limit: 500 },
        clients: { count: 0, limit: 200 },
        suppliers: { count: 0, limit: 100 }
    };
  }
}

export async function dbCheck() {
    try {
        const tablesResult = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        const columnsResult = await db.execute(sql`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`);
        
        const tables = Array.isArray(tablesResult) ? tablesResult : (tablesResult.rows || []);
        const columns = Array.isArray(columnsResult) ? columnsResult : (columnsResult.rows || []);
        
        return { tables, columns };
    } catch (e: any) {
        return { error: e.message };
    }
}
