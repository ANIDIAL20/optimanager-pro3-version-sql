/**
 * Authentication Helper Functions
 * Handles Firebase token verification and user context
 */

import { cookies } from 'next/headers';
import { adminAuth } from './firebaseAdmin';

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  role?: 'admin' | 'user';
}

/**
 * Get the current authenticated user from session/cookie
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');
    
    if (!session?.value) {
      return null;
    }
    
    // Verify the session token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(session.value);
    
    // Get user details
    const userRecord = await adminAuth.getUser(decodedToken.uid);
    
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || null,
      role: (userRecord.customClaims?.role as 'admin' | 'user') || 'user',
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

/**
 * Alternative: Get user from request headers (for API routes)
 */
export async function getUserFromHeaders(headers: Headers): Promise<AuthUser | null> {
  try {
    const authHeader = headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userRecord = await adminAuth.getUser(decodedToken.uid);
    
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || null,
      role: (userRecord.customClaims?.role as 'admin' | 'user') || 'user',
    };
  } catch (error) {
    console.error('Error verifying token from headers:', error);
    return null;
  }
}
