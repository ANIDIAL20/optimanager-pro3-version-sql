/**
 * Authentication Helper Functions
 * Integrates Auth.js with Server Actions
 */

import { auth } from '@/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  role?: 'admin' | 'user';
}

/**
 * Get the current authenticated user from Auth.js
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return null;
    }
    
    // Map Auth.js user to our AuthUser interface
    return {
      uid: session.user.id,
      email: session.user.email || null,
      emailVerified: !!session.user.emailVerified,
      displayName: session.user.name || null,
      role: session.user.role,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 * Use this at the start of protected server actions
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required. Please log in.');
  }
  
  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return user;
}

/**
 * Get user ID from authenticated user
 * This is what we'll use to filter database queries
 */
export async function getUserId(): Promise<string> {
  const user = await requireAuth();
  return user.uid;
}

/**
 * Verify that a resource belongs to the current user
 * Use before updating/deleting resources
 */
export async function verifyResourceOwnership(resourceUserId: string): Promise<void> {
  const currentUserId = await getUserId();
  
  if (resourceUserId !== currentUserId) {
    throw new Error('Unauthorized: You do not own this resource');
  }
}
