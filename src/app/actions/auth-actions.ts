/**
 * Auth Actions - User Authentication & Management
 * Server actions for Auth.js with Drizzle ORM
 */

'use server';

import { signIn, signOut } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth-helpers';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

/**
 * Authenticate user with email and password
 * Called from login form
 */
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return 'Email et mot de passe requis';
    }

    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Email ou mot de passe incorrect';
        default:
          return 'Erreur de connexion';
      }
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logout() {
  await signOut({ redirectTo: '/login' });
}

// ========================================
// ADMIN ACTIONS
// ========================================

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface CreateUserResponse {
  success: boolean;
  userId?: string;
  error?: string;
  message?: string;
}

/**
 * Create a new user account
 * Admin-only action
 */
export async function createUserAction(input: CreateUserInput): Promise<CreateUserResponse> {
  try {
    // ðŸ”’ Security: Verify caller is an admin
    const adminUser = await requireAdmin();
    
    console.log('ðŸ‘¤ Admin creating new user:', input.email);

    // Validate input
    if (!input.email || !input.password || !input.name) {
      return {
        success: false,
        error: 'Nom, email et mot de passe requis'
      };
    }

    if (input.password.length < 8) {
      return {
        success: false,
        error: 'Le mot de passe doit contenir au moins 8 caractÃ¨res'
      };
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Un utilisateur avec cet email existe dÃ©jÃ '
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Create user in database
    const [newUser] = await db.insert(users).values({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: input.role || 'user',
      emailVerified: new Date(), // Auto-verify for admin-created users
    }).returning();

    console.log('âœ… User created successfully:', newUser.id);

    return {
      success: true,
      userId: newUser.id,
      message: `Utilisateur ${input.email} crÃ©Ã© avec succÃ¨s`
    };

  } catch (error: any) {
    console.error('âŒ Error creating user:', error);

    return {
      success: false,
      error: 'Erreur lors de la crÃ©ation de l\'utilisateur'
    };
  }
}

/**
 * Delete a user account
 * Admin-only action
 */
export async function deleteUser(userId: string): Promise<CreateUserResponse> {
  try {
    const adminUser = await requireAdmin();

    await db.delete(users).where(eq(users.id, userId));

    return {
      success: true,
      message: 'Utilisateur supprimÃ© avec succÃ¨s'
    };

  } catch (error: any) {
    console.error('âŒ Error deleting user:', error);
    
    return {
      success: false,
      error: 'Erreur lors de la suppression de l\'utilisateur'
    };
  }
}

/**
 * Update user role
 * Admin-only action
 */
export async function updateUserRole(
  userId: string,
  role: 'admin' | 'user'
): Promise<CreateUserResponse> {
  try {
    const adminUser = await requireAdmin();

    await db.update(users)
      .set({ role })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: `RÃ´le mis Ã  jour: ${role}`
    };

  } catch (error: any) {
    console.error('âŒ Error updating user role:', error);
    
    return {
      success: false,
      error: 'Erreur lors de la mise Ã  jour du rÃ´le'
    };
  }
}
