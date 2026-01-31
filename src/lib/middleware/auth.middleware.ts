
import { requireAuth, type AuthUser } from '@/lib/auth';
import type { Middleware } from './compose';

export const authenticate = (): Middleware => {
  return async (ctx, next) => {
    // Verify authentication
    const user = await requireAuth();
    
    // Inject user into context
    ctx.user = user;
    ctx.userId = user.uid;
    
    // Continue pipeline
    return next();
  };
};

export const requireRole = (role: 'admin' | 'user'): Middleware => {
  return async (ctx, next) => {
    if (!ctx.user) {
      const user = await requireAuth();
      ctx.user = user;
      ctx.userId = user.uid;
    }

    if (ctx.user.role !== role) {
      throw new Error(`Accès refusé. Rôle requis : ${role}`);
    }

    return next();
  };
};
