import { db } from '@/db';

export type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
