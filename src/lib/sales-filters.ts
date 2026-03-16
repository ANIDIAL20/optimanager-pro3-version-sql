import { notInArray } from 'drizzle-orm';
import { sales } from '@/db/schema/sales';

/**
 * Common sale status filters to be used safely across 'use server' and 'use client' contexts.
 * Note: Drizzle filters like notInArray return SQL objects and should be called via functions
 * when needed in queries to avoid evaluation issues.
 */
export const INVALID_SALE_STATUSES = ['annule', 'brouillon'] as const;

export const getValidSaleFilter = () => 
  notInArray(sales.status, INVALID_SALE_STATUSES as unknown as ('impaye' | 'partiel' | 'paye' | 'brouillon' | 'annule')[]);
