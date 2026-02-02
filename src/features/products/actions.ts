
'use server';

import { createAction } from '@/lib/middleware/compose';
import { authenticate } from '@/lib/middleware/auth.middleware';
import { productRepository } from './repository';
import { productSchema, updateProductSchema } from './schemas';
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

export const createProduct = createAction(
    [authenticate(), validate(productSchema)],
    async (ctx: any) => {
        const { userId, input } = ctx;
        
        const newProduct = await productRepository.createProduct({
            ...input,
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        revalidatePath('/dashboard/produits');
        return newProduct;
    }
);

export const updateProduct = createAction(
    [authenticate(), validate(updateProductSchema)],
    async (ctx: any) => {
        const { userId, input } = ctx;
        const { id, ...data } = input;

        const updatedProduct = await productRepository.updateProduct(id, userId, {
            ...data,
            updatedAt: new Date()
        });

        revalidatePath('/dashboard/produits');
        return updatedProduct;
    }
);

export const deleteProduct = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId, input: productId } = ctx;
        const id = parseInt(productId);
        if (isNaN(id)) throw new Error('ID invalide');
        
        await productRepository.deleteProduct(id, userId);
        revalidatePath('/dashboard/produits');
        revalidatePath('/produits');
        revalidatePath('/dashboard/stock');
        return { success: true };
    }
);

export const getProducts = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId, input } = ctx;
        if (input && typeof input === 'string' && input.trim().length > 0) {
            return await productRepository.search(userId, input);
        }
        return await productRepository.findByUserId(userId);
    }
);

export const getCategories = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId } = ctx;
        const distinctCategories = await productRepository.getCategories(userId);
        // Returns objects with id/name for UI compatibility (Tabs use id)
        // Since we don't have IDs for categories in Neon yet (storing strings), we use name as ID.
        return distinctCategories.map(c => ({ id: c, name: c }));
    }
);

export const getProduct = createAction(
    [authenticate()],
    async (ctx: any) => {
        const { userId, input: productId } = ctx;
        // Check if productId is number
        const id = parseInt(productId);
        if (isNaN(id)) throw new Error('ID invalide');

        const product = await productRepository.findById(id); // expects number
        
        if (!product || product.userId !== userId) {
            throw new Error('Produit introuvable');
        }
        return product;
    }
);
