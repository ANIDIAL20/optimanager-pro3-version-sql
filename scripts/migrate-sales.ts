
import * as admin from 'firebase-admin';
import { db } from '../src/db';
import { sales, clients } from '../src/db/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const serviceAccount = require('../service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firestore = admin.firestore();

// 🛠️ Helpers
function safeString(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

function safeDecimal(val: any): string {
  if (val === undefined || val === null || val === '' || isNaN(val)) return '0';
  return String(val);
}

async function migrateSales() {
  console.log("🚀 Starting Sales Migration...");

  try {
    const snapshot = await firestore.collectionGroup('sales').get();
    console.log(`📊 Found ${snapshot.size} sales.`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Cache clients map 
    console.log("🔄 caching clients...");
    const allClients = await db.select({ id: clients.id, firebaseId: clients.firebaseId }).from(clients);
    const clientMap = new Map(allClients.map(c => [c.firebaseId, c.id]));
    console.log(`✅ Cached ${clientMap.size} clients.`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Determine ownerId
      // usage stores/{userId}/sales
      const pathParts = doc.ref.path.split('/');
      let ownerId = 'default_owner';
      if (pathParts[0] === 'stores') ownerId = pathParts[1];
      else ownerId = data.userId || process.env.FIREBASE_USER_ID || 'default_owner';

      // Determine Client ID
      let firebaseClientId = data.clientId || data.clientRef;
      if (!firebaseClientId) {
          // If no direct link, maybe we can assume unknown or look at clientName?
          // For now, if no clientId, we rely on potentially creating empty sales or skipping
          // But sales table has clientId as nullable? 
          // Schema: clientId: integer('client_id').references(() => clients.id),
          // It's nullable by default in Drizzle unless .notNull() is added.
          // Let's check schema.ts -> it IS nullable.
      }

      const neonClientId = firebaseClientId ? clientMap.get(firebaseClientId) : undefined;

      const newSale = {
        userId: ownerId,
        firebaseId: doc.id,
        clientId: neonClientId, // Can be null/undefined
        saleNumber: data.saleNumber || `SALE-${doc.id.slice(0, 8)}`, // 🆕 Generate sale number
        
        // Client Snapshot Info
        clientName: safeString(data.clientName || data.nomClient),
        clientPhone: safeString(data.clientPhone || data.telClient),
        clientMutuelle: safeString(data.clientMutuelle || data.mutuelle),
        clientAddress: safeString(data.clientAddress || data.adresseClient),
        
        // Financials
        totalHT: safeDecimal(data.totalHT),
        totalTVA: safeDecimal(data.totalTVA),
        totalTTC: safeDecimal(data.totalTTC || data.total || data.totalNet),
        totalNet: safeDecimal(data.totalNet || data.total),
        totalPaye: safeDecimal(data.totalPaye || data.amountPaid),
        resteAPayer: safeDecimal(data.resteAPayer || data.balanceDue),
        
        // Status & Metadata
        status: safeString(data.status || data.statut || 'impaye'),
        paymentMethod: safeString(data.paymentMethod || data.modePaiement),
        type: safeString(data.type || 'vente'),
        
        // JSON Fields
        items: data.items || [],
        paymentHistory: data.paymentHistory || data.payments || [],
        prescriptionSnapshot: data.prescriptionSnapshot || null,
        
        notes: safeString(data.notes || data.remarque),
        date: data.date ? new Date(data.date) : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()),
        lastPaymentDate: data.lastPaymentDate ? new Date(data.lastPaymentDate) : null,
        
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: new Date()
      };

      try {
        const existing = await db.select().from(sales).where(eq(sales.firebaseId, doc.id)).limit(1);

        if (existing.length === 0) {
          await db.insert(sales).values(newSale);
          // console.log(`✅ Migrated Sale: ${newSale.totalTTC} MAD`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error migrating sale ${doc.id}:`, err);
        errorCount++;
      }
    }

    console.log("\n============================================================");
    console.log(`✅ Final Results:`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log("============================================================");

  } catch (error) {
    console.error("❌ Fatal Error:", error);
  } finally {
      process.exit();
  }
}

migrateSales();
