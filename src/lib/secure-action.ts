/**
 * Secure Action Wrapper
 * Automatically handles authentication and injects userId
 */

import { auth } from '@/auth';
import { type AuthUser } from '@/lib/auth-helpers';
import { requireAdmin } from './auth-guard';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * Type definitions for secure actions
 */
type SecureActionHandler<TArgs extends any[], TReturn> = (
  userId: string,
  user: AuthUser,
  ...args: TArgs
) => Promise<TReturn>;

type AdminActionHandler<TArgs extends any[], TReturn> = (
  user: AuthUser,
  ...args: TArgs
) => Promise<TReturn>;

/**
 * Wrapper for server actions that require authentication
 * Automatically injects userId and user object
 * 
 * Usage:
 * export const getProducts = secureAction(async (userId, user) => {
 *   return await db.select().from(products).where(eq(products.userId, userId));
 * });
 */
export function secureAction<TArgs extends any[], TReturn>(
  handler: SecureActionHandler<TArgs, TReturn>
) {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        throw new Error("Authentication required. Please log in.");
      }

      const user: AuthUser = {
        uid: session.user.id || '',
        id: session.user.id || '',
        email: session.user.email || null,
        emailVerified: !!session.user.emailVerified,
        displayName: session.user.name || null,
        name: session.user.name || null,
        image: session.user.image || null,
        role: (session.user.role as 'ADMIN' | 'USER') || 'USER',
      };
      
      return await handler(user.uid, user, ...args);
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }

      if (error.message === 'UNAUTHENTICATED') {
        throw new Error('Please login first');
      }

      console.error('Secure action error:', error);
      throw new Error(error.message || 'Authentication failed');
    }
  };
}

/**
 * Wrapper for admin-only server actions
 * Throws error if user is not admin
 * 
 * Usage:
 * export const deleteAllProducts = adminAction(async (user) => {
 *   // Only admins can execute this
 *   return await db.delete(products);
 * });
 */
export function adminAction<TArgs extends any[], TReturn>(
  handler: AdminActionHandler<TArgs, TReturn>
) {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      const { user: dbUser } = await requireAdmin();

      // Map DB user (id: number) to AuthUser interface
      const user: AuthUser = {
        uid:          dbUser.id.toString(),
        id:           dbUser.id.toString(),
        email:        dbUser.email ?? null,
        emailVerified: false,
        displayName:  dbUser.name ?? null,
        name:         dbUser.name ?? null,
        image:        null,
        role:         (dbUser.role as 'ADMIN' | 'USER') ?? 'ADMIN',
      };

      // Call the handler with mapped user object
      return await handler(user, ...args);
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }

      if (error.message === 'UNAUTHENTICATED') {
        throw new Error('Authentication required');
      }

      if (error.message === 'FORBIDDEN') {
        throw new Error('Admin access required');
      }

      console.error('Admin action error:', error);
      throw new Error(error.message || 'Admin action failed');
    }
  };
}

/**
 * Response wrapper for consistent API responses
 */
export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Helper to create success response
 */
export function successResponse<T>(data: T, message?: string): ActionResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Helper to create error response
 */
export function errorResponse(error: string): ActionResponse {
  return {
    success: false,
    error,
  };
}

/**
 * Secure action with standardized response
 * Returns { success, data, error } format
 */
export function secureActionWithResponse<TArgs extends any[], TReturn>(
  handler: SecureActionHandler<TArgs, TReturn>
) {
  return async (...args: TArgs): Promise<ActionResponse<TReturn>> => {
    try {
      const user = await requireAuth();
      const userId = user.uid;
      
      const result = await handler(userId, user, ...args);
      return successResponse(result);
    } catch (error: any) {
      if (error.message === 'UNAUTHENTICATED') {
        return errorResponse('Authentication required');
      }
      if (error.message === 'FORBIDDEN') {
        return errorResponse('Admin access required');
      }
      console.error('Secure action error:', error);
      return errorResponse(error.message || 'Operation failed');
    }
  };
}
