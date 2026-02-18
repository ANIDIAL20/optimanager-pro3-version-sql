import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { supplierPayments } = await import('./src/db/schema/index');
  const { eq, and, isNull } = await import('drizzle-orm');

  const supplierId = 'd1181135-9c6d-409b-aaf3-3e3f5421cacf';

  try {
    const payments = await db.select()
      .from(supplierPayments)
      .where(
        and(
          eq(supplierPayments.supplierId, supplierId),
          isNull(supplierPayments.deletedAt)
        )
      );
    
    console.log('Drizzle Payments Count:', payments.length);
    if (payments.length > 0) {
        console.log('First Payment Amount:', payments[0].amount);
    } else {
        console.log('No payments found for ID:', supplierId);
        
        // Try without isNull check
        const all = await db.select().from(supplierPayments).where(eq(supplierPayments.supplierId, supplierId));
        console.log('Total (no deleted check):', all.length);
    }

  } catch (e: any) {
    console.error('❌ Drizzle Error:', e.message);
  }
}

run().then(() => process.exit(0));
