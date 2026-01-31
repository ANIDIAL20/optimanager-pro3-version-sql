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
 */
export async function requireAdmin() {
  const session = await requireAuth();
  
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (session.user.email !== ADMIN_EMAIL && session.user.role !== 'admin') {
    redirect('/dashboard');
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
