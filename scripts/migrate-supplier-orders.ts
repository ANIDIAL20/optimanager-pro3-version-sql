
import * as admin from 'firebase-admin';
import { db } from '../src/db';
import { supplierOrders } from '../src/db/schema';
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

async function migrateSupplierOrders() {
  console.log("🚀 Starting Supplier Orders Migration...");

  try {
    const snapshot = await firestore.collectionGroup('supplier_orders').get();
    console.log(`📊 Found ${snapshot.size} supplier orders.`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Determine ownerId
      const pathParts = doc.ref.path.split('/');
      let ownerId = 'default_owner';
      if (pathParts[0] === 'stores') ownerId = pathParts[1];
      else ownerId = data.userId || process.env.FIREBASE_USER_ID || 'default_owner';

      const newOrder = {
        userId: ownerId,
        firebaseId: doc.id,
        
        fournisseur: safeString(data.fournisseur || data.supplierName || 'Unknown Supplier') || 'Unknown',
        items: data.items || [],
        
        montantTotal: safeDecimal(data.montantTotal || data.totalAmount || data.total),
        montantPaye: safeDecimal(data.montantPaye || data.amountPaid || data.paid),
        resteAPayer: safeDecimal(data.resteAPayer || data.balanceDue), // Optional in schema? Yes
        
        statut: safeString(data.statut || data.status || 'EN_COURS'),
        
        dateCommande: data.dateCommande ? new Date(data.dateCommande) : (data.orderDate ? new Date(data.orderDate) : null),
        dateReception: data.dateReception ? new Date(data.dateReception) : (data.receivedDate ? new Date(data.receivedDate) : null),
        
        notes: safeString(data.notes || data.remarque),
        
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: new Date()
      };

      try {
        const existing = await db.select().from(supplierOrders).where(eq(supplierOrders.firebaseId, doc.id)).limit(1);

        if (existing.length === 0) {
          await db.insert(supplierOrders).values(newOrder);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error migrating supplier order ${doc.id}:`, err);
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

migrateSupplierOrders();
