
'use server';

import { createAction } from '@/lib/middleware/compose';
import { authenticate } from '@/lib/middleware/auth.middleware';
import { clientRepository } from './repository';
import { clientSchema, updateClientSchema } from './schemas';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Validateur simple pour les inputs
 */
const validate = <T>(schema: z.Schema<T>) => {
    return async (ctx: any, next: any) => {
        const result = schema.safeParse(ctx.input);
        if (!result.success) {
            throw new Error(result.error.errors[0].message);
        }
        ctx.input = result.data;
        return next();
    };
};

/**
 * Action: Create Client
 */
export const createClient = createAction(
    [authenticate(), validate(clientSchema)],
    async (ctx: any) => {
        const { userId, input } = ctx;
        
        const newClient = await clientRepository.createClient({
            ...input,
            userId,
            balance: '0',
            totalSpent: '0',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        revalidatePath('/dashboard/clients');
        return newClient;
    }
);

/**
 * Action: Update Client
 */
export const updateClient = createAction(
    [authenticate(), validate(updateClientSchema)],
    async (ctx: any) => {
        const { userId, input } = ctx;
        const { id, ...data } = input;

        const updatedClient = await clientRepository.updateClient(id, userId, {
            ...data,
            updatedAt: new Date()
        });

        revalidatePath(`/dashboard/clients`);
        revalidatePath(`/dashboard/clients/${id}`);
        revalidatePath(`/dashboard/clients/${id}`);
        return updatedClient;
    }
);

/**
 * Action: Delete Client
 */
export const deleteClient = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId, input: clientId } = ctx;
        // Ensure clientId is number
        const id = parseInt(clientId.toString());
        await clientRepository.deleteClient(id, userId);
        revalidatePath('/dashboard/clients');
        return { success: true };
    }
);

/**
 * Action: Get All Clients (for current user)
 */
export const getClients = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId, user } = ctx;
        return await clientRepository.findByUserId(userId, user?.role);
    }
);

/**
 * Action: Get Single Client
 */
export const getClient = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId, user, input: clientId } = ctx; // Input is just the ID here
        // Ensure clientId is number
        const id = typeof clientId === 'string' ? parseInt(clientId) : clientId;

        const client = await clientRepository.findById(id);

        if (!client || (client.userId !== userId && user.role !== 'admin')) {
            throw new Error('Client introuvable ou accès refusé');
        }

        return client;
    }
);
