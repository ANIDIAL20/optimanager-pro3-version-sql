import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const { db } = await import('../src/db/index');
    const { users } = await import('../src/db/schema');
    
    console.log("Testing individual column selection with Drizzle Query Builder...");

    const columns: (keyof typeof users)[] = [
        "id", "name", "email", "emailVerified", "image", "password", 
        "role", "isActive", "failedLoginAttempts", "lockoutUntil", 
        "maxProducts", "maxClients", "maxSuppliers", 
        "lastPaymentDate", "nextPaymentDate", "subscriptionExpiry", 
        "paymentMode", "billingCycle", "agreedPrice", 
        "trainingPrice", "setupPrice", "amountPaid", 
        "installmentsCount", "nextInstallmentDate", 
        "lastLoginAt", "createdAt", "updatedAt"
    ] as any;

    for (const colName of columns) {
        try {
            // @ts-ignore
            const col = users[colName];
            if (!col) {
                console.log(`⚠️ Column object not found in schema for: ${String(colName)}`);
                continue;
            }
            
            // Try to select just this column
            const res = await db.select({ val: col }).from(users).limit(1);
            console.log(`✅ Success for column: ${String(colName)}`);
        } catch (e: any) {
             console.error(`❌ FAILED for column: ${String(colName)} - Error: ${e.message}`);
        }
    }

  } catch (error: any) {
    console.error("❌ Fatal Error:", error.message);
  } finally {
    process.exit();
  }
}

main();
