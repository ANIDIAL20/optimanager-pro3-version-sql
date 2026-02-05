'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-utils';
import { revalidatePath } from 'next/cache';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { auth } from '@/auth';

export interface UserLimitsInput {
  maxProducts: number;
  maxClients: number;
  maxSuppliers: number;
}

export async function updateUserLimits(targetUserId: string, limits: UserLimitsInput) {
  const session = await auth();
  const operatorId = session?.user?.id || 'system';

  try {
    // 🔐 Admin Guard
    await requireAdmin();

    console.log(`🔧 Updating limits for user ${targetUserId}:`, limits);

    await db.update(users)
      .set({
        maxProducts: limits.maxProducts,
        maxClients: limits.maxClients,
        maxSuppliers: limits.maxSuppliers,
        updatedAt: new Date()
      })
      .where(eq(users.id, targetUserId));

    await logSuccess(operatorId, 'UPDATE', 'users', targetUserId, { action: 'UPDATE_LIMITS', limits });
    revalidatePath('/dashboard/admin/users');
    
    return { success: true, message: 'Quotas mis à jour avec succès' };
  } catch (error: any) {
    console.error('💥 Error updating user limits:', error);
    await logFailure(operatorId, 'UPDATE', 'users', error.message, targetUserId);
    return { success: false, error: 'Erreur lors de la mise à jour des quotas' };
  }
}
