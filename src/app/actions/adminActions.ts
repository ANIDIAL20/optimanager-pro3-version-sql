'use server';

import { adminAction } from '@/lib/secure-action';
import { requireAdmin } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { products, users, clients, suppliers } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';


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

    // 1. Hash password statically
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Update DB & Unlock Account, checking if row actually updated
    const updatedUsers = await db.update(users)
        .set({
            password: hashedPassword,
            failedLoginAttempts: 0,
            lockoutUntil: null, 
            updatedAt: new Date()
        })
        .where(eq(users.id, uid))
        .returning({ updatedId: users.id });

    if (updatedUsers.length === 0) {
        return { success: false, error: "Utilisateur introuvable dans la base de données (ADMIN_DB_UNAVAILABLE ou ID invalide)" };
    }

    revalidatePath('/admin');
    return { success: true, message: "Mot de passe réinitialisé avec succès !" };

  } catch (error: any) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Erreur serveur critique: " + (error.message || 'ADMIN_DB_UNAVAILABLE') };
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
  try {
    const newIsActive = currentStatus !== 'active';
    await db.update(users)
      .set({ isActive: newIsActive, updatedAt: new Date() })
      .where(eq(users.id, uid));

    revalidatePath('/admin');
    return { success: true, message: newIsActive ? 'Compte activé' : 'Compte suspendu' };
  } catch (error: any) {
    console.error('Error toggling status:', error);
    return { success: false, error: 'Erreur: ' + error.message };
  }
});

export const extendSubscription = adminAction(async (user, uid: string, period: 'monthly' | 'yearly') => {
  try {
    // Get current expiry
    const [target] = await db.select({ subscriptionExpiry: users.subscriptionExpiry })
      .from(users).where(eq(users.id, uid)).limit(1);

    // Start from current expiry or now
    const baseDate = target?.subscriptionExpiry && new Date(target.subscriptionExpiry) > new Date()
      ? new Date(target.subscriptionExpiry)
      : new Date();

    const months = period === 'yearly' ? 12 : 1;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    await db.update(users)
      .set({
        subscriptionExpiry: newExpiry,
        billingCycle: period,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, uid));

    revalidatePath('/admin');
    const label = period === 'yearly' ? '1 an' : '1 mois';
    return { success: true, message: `Abonnement prolongé de ${label} (jusqu'au ${newExpiry.toLocaleDateString('fr-FR')})` };
  } catch (error: any) {
    console.error('Error extending subscription:', error);
    return { success: false, error: 'Erreur: ' + error.message };
  }
});

export const updateClientPlan = adminAction(async (user, uid: string, data: { expiryDate: Date, gracePeriod: number, status: 'active' | 'suspended' | 'frozen' }) => {
  try {
    await db.update(users)
      .set({
        subscriptionExpiry: data.expiryDate,
        isActive: data.status === 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.id, uid));

    revalidatePath('/admin');
    return { success: true, message: 'Plan mis à jour avec succès' };
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return { success: false, error: 'Erreur: ' + error.message, message: '' };
  }
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
  try {
    // Delete all user data using raw SQL for FK safety (same order as purgeAllUserData in backup)
    // Step 0: Break circular FKs
    await db.execute(sql`UPDATE devis SET sale_id = NULL WHERE user_id = ${uid}`);
    await db.execute(sql`UPDATE lens_orders SET sale_id = NULL WHERE user_id = ${uid}`);
    await db.execute(sql`UPDATE reservations SET sale_id = NULL WHERE user_id = ${uid}`);
    await db.execute(sql`UPDATE frame_reservations SET sale_id = NULL WHERE store_id = ${uid}`);

    // Step 1: Leaf tables
    const leafTables = [
      'sale_lens_details', 'sale_contact_lens_details', 'sale_items',
      'goods_receipt_items', 'supplier_order_items',
      'frame_reservations', 'client_interactions', 'prescriptions',
      'devis', 'lens_orders', 'reservations',
      'payments', 'sales', 'clients',
      'goods_receipts', 'supplier_orders', 'suppliers',
      'expenses_v2', 'purchases', 'products',
      'reminders', 'notifications', 'audit_log',
      'settings', 'shop_profiles',
    ];

    for (const table of leafTables) {
      const col = table === 'frame_reservations' ? 'store_id' : 'user_id';
      try {
        await db.execute(sql.raw(`DELETE FROM "${table}" WHERE "${col}" = '${uid}'`));
      } catch { /* table may not exist */ }
    }

    // Step 2: Delete user account + sessions + accounts
    await db.execute(sql`DELETE FROM sessions WHERE "userId" = ${uid}`);
    await db.execute(sql`DELETE FROM accounts WHERE "userId" = ${uid}`);
    await db.delete(users).where(eq(users.id, uid));

    revalidatePath('/admin');
    return { success: true, message: 'Client et toutes ses données supprimés avec succès' };
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return { success: false, error: 'Erreur lors de la suppression: ' + error.message };
  }
});

export const updateGlobalBanner = adminAction(async (user, data: { message: string, type: 'info' | 'warning' | 'critical', active: boolean }) => {
  try {
    const { settings } = await import('@/db/schema');
    const existing = await db.select().from(settings)
      .where(eq(settings.settingKey, 'global_banner'))
      .limit(1);

    const bannerValue = { message: data.message, type: data.type, active: data.active };

    if (existing.length > 0) {
      await db.update(settings)
        .set({ value: bannerValue })
        .where(eq(settings.settingKey, 'global_banner'));
    } else {
      await db.insert(settings).values({
        userId: user.id,
        settingKey: 'global_banner',
        value: bannerValue,
      });
    }

    revalidatePath('/');
    return { success: true, message: 'Bannière mise à jour' };
  } catch (error: any) {
    console.error('Error updating banner:', error);
    return { success: false, error: 'Erreur: ' + error.message };
  }
});

export async function getGlobalBanner() {
  // This is called from layout, so don't require admin
  try {
    const { settings } = await import('@/db/schema');
    const [banner] = await db.select().from(settings)
      .where(eq(settings.settingKey, 'global_banner'))
      .limit(1);
    return banner?.value || null;
  } catch {
    return null;
  }
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
                console.warn(`❌ [DB WARNING] User limits fetch failed:`, e.message);
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

    // Robust count fetcher using select with explicit casting for multi-tenant isolation
    const fetchCount = async (tableName: string) => {
        let attempts = 0;
        const maxAttempts = 2;
        const targetTable = tableMap[tableName];

        if (!targetTable) {
            console.warn(`❌ [DB WARNING] Table mapping for ${tableName} not found`);
            return 0;
        }

        while (attempts < maxAttempts) {
            try {
                // TRY 1: Standard Drizzle eq() - most robust if types match
                const res = await db.select({ value: count() })
                    .from(targetTable)
                    .where(eq(targetTable.userId, trimmedId));
                
                const val = Number(res[0]?.value || 0);
                console.log(`✅ [DB SUCCESS] ${tableName} count: ${val}`);
                return val;
            } catch (e: any) {
                attempts++;
                console.warn(`❌ [DB ATTEMPT ${attempts}] ${tableName} count failed: ${e.message}`);
                
                // Diagnostic logging
                if (e.code) console.warn(`🔍 [DB ERROR CODE] ${e.code}`);
                if (e.detail) console.warn(`🔍 [DB ERROR DETAIL] ${e.detail}`);
                
                // If it's a "column does not exist" type of error, log available columns
                if (e.message.includes('column') || e.code === '42703') {
                    try {
                        const cols = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${tableName}`);
                        const colNames = Array.isArray(cols) ? cols.map((c: any) => c.column_name) : (cols.rows?.map((c: any) => c.column_name) || []);
                        console.warn(`📡 [DB DIAGNOSTIC] Columns for ${tableName}: ${colNames.join(', ')}`);
                    } catch (diagE) {}
                }

                // TRY 2: Explicit casting fallback if it was a type mismatch (e.g. UUID vs TEXT in DB)
                if (attempts === 1) {
                    try {
                        const resFallback = await db.select({ value: count() })
                            .from(targetTable)
                            .where(sql`${targetTable.userId}::text = ${trimmedId}`);
                        return Number(resFallback[0]?.value || 0);
                    } catch (innerE: any) {
                        console.warn(`❌ [DB FALLBACK FAILED] ${tableName} casting failed: ${innerE.message}`);
                    }
                }

                if (attempts >= maxAttempts) return 0;
                await new Promise(resolve => setTimeout(resolve, attempts * 500));
            }
        }
        return 0;
    };

    // Simplified Parallel fetching for performance
    const [pCountResult, cCountResult, sCountResult, userRes] = await Promise.all([
      db.select({ value: count() }).from(products).where(eq(products.userId, trimmedId)),
      db.select({ value: count() }).from(clients).where(eq(clients.userId, trimmedId)),
      db.select({ value: count() }).from(suppliers).where(eq(suppliers.userId, trimmedId)),
      db.select({
        maxProducts: users.maxProducts,
        maxClients: users.maxClients,
        maxSuppliers: users.maxSuppliers
      }).from(users).where(eq(users.id, trimmedId)).limit(1)
    ]);

    const user = userRes[0];

    return {
      products: { 
        count: Number(pCountResult[0]?.value || 0), 
        limit: Number(user?.maxProducts || 500) 
      },
      clients: { 
        count: Number(cCountResult[0]?.value || 0), 
        limit: Number(user?.maxClients || 200) 
      },
      suppliers: { 
        count: Number(sCountResult[0]?.value || 0), 
        limit: Number(user?.maxSuppliers || 100) 
      },
    };
  } catch (error: any) {
    console.warn("❌ Usage Stats Error (Final):", error);
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
