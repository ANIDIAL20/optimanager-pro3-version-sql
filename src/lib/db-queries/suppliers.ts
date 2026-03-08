/**
 * Pure DB query layer - NO 'use server' directive.
 * Safe to call from any server-side context.
 *
 * Uses the main shared db Pool (neon-serverless) - same connection that all
 * other server actions use. The previous neon-http client was removed because
 * its fetch() calls bypassed the --dns-result-order=ipv4first Node.js flag and
 * caused intermittent ENOTFOUND DNS errors.
 *
 * These functions do NOT validate auth - caller must provide a pre-validated userId.
 */

import { db } from '@/db';
import { supplierBalanceView, suppliers } from '@/db/schema';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';

export interface GetSuppliersParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

async function withReadRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 200));
    }
  }

  throw lastError;
}

export async function querySuppliersListPaginated(
  userId: string,
  params: GetSuppliersParams = {}
) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const offset = (page - 1) * limit;

  const conditions = [eq(suppliers.userId, userId)] as ReturnType<typeof eq>[];

  if (params.search) {
    conditions.push(ilike(suppliers.name, `%${params.search}%`));
  }
  if (params.category) {
    conditions.push(ilike(suppliers.category, `%${params.category}%`));
  }

  const whereClause = and(...conditions);

  const rows = await withReadRetry(() =>
    db
      .select({
        id: suppliers.id,
        userId: suppliers.userId,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        city: suppliers.city,
        ice: suppliers.ice,
        category: suppliers.category,
        paymentTerms: suppliers.paymentTerms,
        paymentMethod: suppliers.paymentMethod,
        status: suppliers.status,
        createdAt: suppliers.createdAt,
        contactName: suppliers.contactName,
        contactPhone: suppliers.contactPhone,
        contactEmail: suppliers.contactEmail,
        currentBalance: supplierBalanceView.soldeReel,
        totalAchats: supplierBalanceView.totalAchats,
        totalPaiements: supplierBalanceView.totalPaiements,
        totalCount: sql<number>`count(*) over()`,
      })
      .from(suppliers)
      .leftJoin(
        supplierBalanceView,
        and(
          eq(supplierBalanceView.supplierId, suppliers.id),
          eq(supplierBalanceView.userId, suppliers.userId)
        )
      )
      .where(whereClause)
      .orderBy(desc(suppliers.createdAt))
      .limit(limit)
      .offset(offset)
  );

  const totalCount = Number(rows[0]?.totalCount ?? 0);

  const data = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    ice: row.ice || '',
    category: row.category || '',
    paymentTerms: row.paymentTerms || '',
    paymentMethod: row.paymentMethod || '',
    status: row.status || 'Actif',
    createdAt: row.createdAt,
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    contactEmail: row.contactEmail || '',
    nomCommercial: row.name || '',
    telephone: row.phone || '',
    typeProduits: (row.category || '').split(', ').filter(Boolean),
    currentBalance: Number(row.currentBalance ?? 0),
    totalAchats: Number(row.totalAchats ?? 0),
    totalPaiements: Number(row.totalPaiements ?? 0),
  }));

  return {
    data,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    limit,
  };
}