import 'server-only';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cache } from 'react';

/**
 * Get current user session (cached)
 * Use this in Server Components and Server Actions
 */
export const getCurrentSession = cache(async () => {
  return await auth();
});

/**
 * Require authentication - redirects to /login if not authenticated
 */
export async function requireAuth() {
  const session = await getCurrentSession();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  return session;
}

/**
 * Require admin role - redirects to /dashboard if not admin
 * Accepts: role === 'ADMIN' (from DB) OR email matches NEXT_PUBLIC_ADMIN_EMAIL
 */
export async function requireAdmin() {
  const session = await requireAuth();
  
  const role = (session.user.role || '').toUpperCase();
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdminByRole = role === 'ADMIN';
  const isAdminByEmail = ADMIN_EMAIL && session.user.email === ADMIN_EMAIL;
  
  if (!isAdminByRole && !isAdminByEmail) {
    redirect('/dashboard?error=unauthorized');
  }
  
  return session;
}

/**
 * Get user ID from session
 */
export async function getUserId() {
  const session = await requireAuth();
  return session.user.id;
}
