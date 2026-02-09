import { z } from 'zod';

export const RoleSchema = z.enum(['ADMIN', 'USER']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: RoleSchema,
});

export type ValidatedRole = z.infer<typeof RoleSchema>;
export type ValidatedUser = z.infer<typeof UserSchema>;
