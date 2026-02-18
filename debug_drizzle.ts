import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';

async function run() {
  const { db } = await import('./src/db');
  const { sql } = await import('drizzle-orm');
  const { supplierPayments } = await import('./src/db/schema/index');

  let output = '';
  const log = (msg: string) => { console.log(msg); output += msg + '\n'; };

  try {
    log('--- Attempting Insert via Drizzle directly ---');
    const now = new Date();
    const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
    const supplierId = 'd1181135-9c6d-409b-aaf3-3e3f5421cacf';
    
    try {
      const [payment] = await db.insert(supplierPayments).values({
        userId: userId,
        supplierId: supplierId,
        supplierName: 'Verres Qualite Superieure',
        orderId: 3,
        amount: '100',
        paymentDate: now,
        method: 'Espèces',
        createdBy: userId,
        createdAt: now,
      }).returning();
      log(`✅ Drizzle insert succeeded: ${payment.id}`);
    } catch (err: any) {
      log('❌ DRIZZLE ERROR:');
      log(`Message: ${err.message}`);
      log(`Stack: ${err.stack}`);
    }

  } catch (e: any) {
    log(`❌ Global Error: ${e.message}`);
  }

  fs.writeFileSync('debug_drizzle.txt', output);
}

run().then(() => process.exit(0));
