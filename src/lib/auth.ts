import 'server-only';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cache } from 'react';

/**
 * Auth user interface matching Auth.js session structure
 */
export interface AuthUser {
  uid: string; // Keeping 'uid' for backward compatibility, maps to 'id'
  id: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  name: string | null;
  image: string | null;
  role: 'admin' | 'user';
}

/**
 * Get the current authenticated user (cached)
 * Returns null if not authenticated
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await auth();

  console.log('🔍 getCurrentUser - Session check:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    userRole: session?.user?.role,
  });

  if (!session?.user) {
    console.log('❌ No session or user - returning null');
    return null;
  }

  if (!session.user.id) {
    console.log('⚠️ WARNING: session.user.id is undefined!', {
      user: session.user,
    });
  }

  return {
    uid: session.user.id || '', // Backward compatibility
    id: session.user.id || '',
    email: session.user.email || null,
    emailVerified: true, // Auth.js handles email verification differently
    displayName: session.user.name || null,
    name: session.user.name || null,
    image: session.user.image || null,
    role: (session.user.role as 'admin' | 'user') || 'user',
  };
});

/**
 * Require authentication - redirects to /login if not authenticated
 * Returns the authenticated user
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

/**
 * Alias for requireAuth for backward compatibility
 */
export async function requireUser(): Promise<AuthUser> {
  return requireAuth();
}

/**
 * Require admin role - redirects to /dashboard if not admin
 * Returns the authenticated admin user
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  
  if (user.role !== 'admin' && user.email !== ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  return user;
}

/**
 * Check if user is admin without redirecting
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (!user) {
    return false;
  }

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  return user.role === 'admin' || user.email === ADMIN_EMAIL;
}
