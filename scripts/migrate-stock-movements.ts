
import * as admin from 'firebase-admin';
import { db } from '../src/db';
import { stockMovements, products } from '../src/db/schema';
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

function safeInt(val: any): number {
    if (val === undefined || val === null || isNaN(val)) return 0;
    return parseInt(String(val), 10);
  }

async function migrateStockMovements() {
  console.log("🚀 Starting Stock Movements Migration...");

  try {
    const snapshot = await firestore.collectionGroup('stock_movements').get();
    console.log(`📊 Found ${snapshot.size} movements.`);

    let successCount = 0;
    let errorCount = 0;

    // Cache Products
    console.log("🔄 Caching Products...");
    const allProducts = await db.select({ id: products.id, firebaseId: products.firebaseId }).from(products);
    const productMap = new Map(allProducts.map(p => [p.firebaseId, p.id]));
    console.log(`✅ Cached ${productMap.size} Products.`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      const pathParts = doc.ref.path.split('/');
      let ownerId = 'default_owner';
      if (pathParts[0] === 'stores') ownerId = pathParts[1];
      else ownerId = data.userId || process.env.FIREBASE_USER_ID || 'default_owner';

      // Product Lookup
      let firebaseProductId = data.productId || data.productRef;
      const neonProductId = firebaseProductId ? productMap.get(firebaseProductId) : undefined;
      
      const newMovement = {
        userId: ownerId,
        firebaseId: doc.id,
        productId: neonProductId,
        variantId: safeInt(data.variantId), // integer
        
        type: safeString(data.type || 'IN') as 'IN' | 'OUT' | 'ADJUSTMENT',
        quantity: safeInt(data.quantity || data.quantite),
        
        reason: safeString(data.reason || data.motif),
        reference: safeString(data.reference || data.ref),
        
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      };

      try {
        const existing = await db.select().from(stockMovements).where(eq(stockMovements.firebaseId, doc.id)).limit(1);

        if (existing.length === 0) {
          await db.insert(stockMovements).values(newMovement);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error migrating movement ${doc.id}:`, err);
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

migrateStockMovements();
