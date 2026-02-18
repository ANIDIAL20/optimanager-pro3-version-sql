import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { db } = await import('./src/db');
  const { supplierPayments } = await import('./src/db/schema/index');
  const { eq, and, isNull } = await import('drizzle-orm');

  const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
  const supplierId = 'd1181135-9c6d-409b-aaf3-3e3f5421cacf';

  try {
    const payments = await db.select()
      .from(supplierPayments)
      .where(
        and(
          eq(supplierPayments.userId, userId),
          eq(supplierPayments.supplierId, supplierId)
        )
      );
    
    console.log('Payments Count with userId:', payments.length);
    if (payments.length > 0) {
        console.log('First Payment:', JSON.stringify(payments[0], null, 2));
    }

  } catch (e: any) {
    console.error('❌ Drizzle Error:', e.message);
  }
}

run().then(() => process.exit(0));
