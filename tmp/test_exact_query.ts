
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '../src/db';
import { frameReservations } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function test() {
  const clientId = 33;
  console.log('Testing getClientReservations query for clientId', clientId);
  try {
    const results = await db
      .select({
        id: frameReservations.id,
        storeId: frameReservations.storeId,
        clientId: frameReservations.clientId,
        clientName: frameReservations.clientName,
        status: frameReservations.status,
        items: frameReservations.items,
        reservationDate: frameReservations.reservationDate,
        expiryDate: frameReservations.expiryDate,
        totalAmount: frameReservations.totalAmount,
        depositAmount: frameReservations.depositAmount,
        remainingAmount: frameReservations.remainingAmount,
        completedAt: frameReservations.completedAt,
        saleId: frameReservations.saleId,
        notes: frameReservations.notes,
        createdAt: frameReservations.createdAt,
        updatedAt: frameReservations.updatedAt,
      })
      .from(frameReservations)
      .where(eq(frameReservations.clientId, clientId))
      .orderBy(desc(frameReservations.createdAt));
      
    console.log('Query Success! Count:', results.length);
    console.log('First result:', results[0]);
  } catch (error: any) {
    console.error('Query Failure:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }
}

test().then(() => process.exit(0));
