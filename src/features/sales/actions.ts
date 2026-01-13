
'use server';

import { createAction } from '@/lib/middleware/compose';
import { authenticate } from '@/lib/middleware/auth.middleware';
import { saleSchema } from './schemas';
import { saleService } from './services';
import { saleRepository } from './repository';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

export const createSale = createAction(
    [authenticate(), validate(saleSchema)],
    async (ctx: any) => {
        const { userId, input } = ctx;
        
        const newSale = await saleService.processSale(userId, input);

        revalidatePath('/dashboard/sales');
        revalidatePath('/dashboard/produits'); // Stock updated
        
        return newSale;
    }
);

export const getSales = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId } = ctx;
        return await saleRepository.findByUserId(userId);
    }
);
