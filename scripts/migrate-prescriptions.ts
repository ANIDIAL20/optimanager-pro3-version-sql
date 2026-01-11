
import * as admin from 'firebase-admin';
import { db } from '../src/db';
import { prescriptions, clients } from '../src/db/schema';
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

async function migratePrescriptions() {
  console.log("🚀 Starting Prescriptions Migration...");

  try {
    const snapshot = await firestore.collectionGroup('prescriptions').get();
    console.log(`📊 Found ${snapshot.size} prescriptions.`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Cache clients map to avoid repeated DB calls
    // Map: firebaseId -> neonId (integer)
    console.log("🔄 caching clients...");
    const allClients = await db.select({ id: clients.id, firebaseId: clients.firebaseId }).from(clients);
    const clientMap = new Map(allClients.map(c => [c.firebaseId, c.id]));
    console.log(`✅ Cached ${clientMap.size} clients.`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Determine Client ID from Path
      // Path: stores/{userId}/clients/{clientId}/prescriptions/{id}
      const pathParts = doc.ref.path.split('/');
      let firebaseClientId: string | null = null;
      let ownerId = 'default_owner';
      
      // Check if path is standard nested structure
      if (pathParts.length >= 4 && pathParts[pathParts.length - 2] === 'prescriptions') {
          // Parent is pathParts[pathParts.length - 3] (index 3 if [0]=stores,[1]=uid,[2]=clients,[3]=id)
          // Actually better to just take parent.id
          firebaseClientId = doc.ref.parent.parent?.id || null;
      }
      
      // Fallback: Check data
      if (!firebaseClientId) {
          firebaseClientId = data.clientId || data.client_id;
      }

      // Check ownerId
      if (pathParts[0] === 'stores') ownerId = pathParts[1];
      else ownerId = data.userId || process.env.FIREBASE_USER_ID || 'default_owner';

      // 🔍 Lookup Foreign Key
      const neonClientId = firebaseClientId ? clientMap.get(firebaseClientId) : undefined;

      if (!neonClientId) {
          console.warn(`⚠️ Skipped: Prescription ${doc.id} has no valid client (FirebaseRef: ${firebaseClientId})`);
          skippedCount++;
          continue;
      }

      const newPrescription = {
        userId: ownerId,
        firebaseId: doc.id,
        clientId: neonClientId,
        
        prescriptionData: data.prescriptionData || data, // Store entire object if no specific wrapper keys
        
        date: data.date ? new Date(data.date) : null,
        notes: safeString(data.notes || data.remarque),
        
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: new Date()
      };

      try {
        // Check duplicate
        const existing = await db.select().from(prescriptions).where(eq(prescriptions.firebaseId, doc.id)).limit(1);

        if (existing.length === 0) {
          await db.insert(prescriptions).values(newPrescription);
          console.log(`✅ Migrated: Prescription for Client #${neonClientId}`);
          successCount++;
        } else {
            // console.log(`⏩ Skipped (Duplicate): ${doc.id}`);
        }

      } catch (err) {
        console.error(`❌ Error migrating prescription ${doc.id}:`, err);
        errorCount++;
      }
    }

    console.log("\n============================================================");
    console.log(`✅ Final Results:`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Skipped (No Client): ${skippedCount}`);
    console.log("============================================================");

  } catch (error) {
    console.error("❌ Fatal Error:", error);
  } finally {
      process.exit();
  }
}

migratePrescriptions();
