
import * as admin from 'firebase-admin';
import { db } from '../src/db';
import { devis, clients, sales } from '../src/db/schema';
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

async function migrateDevis() {
  console.log("🚀 Starting Devis Migration...");

  try {
    const snapshot = await firestore.collectionGroup('devis').get();
    console.log(`📊 Found ${snapshot.size} devis.`);

    let successCount = 0;
    let errorCount = 0;
    
    // Cache Lookups
    console.log("🔄 Caching Clients & Sales...");
    const allClients = await db.select({ id: clients.id, firebaseId: clients.firebaseId }).from(clients);
    const clientMap = new Map(allClients.map(c => [c.firebaseId, c.id]));
    
    const allSales = await db.select({ id: sales.id, firebaseId: sales.firebaseId }).from(sales);
    const saleMap = new Map(allSales.map(s => [s.firebaseId, s.id]));
    
    console.log(`✅ Cached ${clientMap.size} Clients, ${saleMap.size} Sales.`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Determine ownerId
      const pathParts = doc.ref.path.split('/');
      let ownerId = 'default_owner';
      if (pathParts[0] === 'stores') ownerId = pathParts[1];
      else ownerId = data.userId || process.env.FIREBASE_USER_ID || 'default_owner';
      
      // Lookup FKs
      let firebaseClientId = data.clientId || data.clientRef;
      const neonClientId = firebaseClientId ? clientMap.get(firebaseClientId) : undefined;
      
      let firebaseSaleId = data.saleId;
      const neonSaleId = firebaseSaleId ? saleMap.get(firebaseSaleId) : undefined;

      const newDevis = {
        userId: ownerId,
        firebaseId: doc.id,
        clientId: neonClientId,
        saleId: neonSaleId,
        
        clientName: safeString(data.clientName || data.nomClient) || 'Unknown Client',
        clientPhone: safeString(data.clientPhone || data.telClient),
        
        items: data.items || [],
        
        totalHT: safeDecimal(data.totalHT),
        totalTTC: safeDecimal(data.totalTTC || data.total),
        
        status: safeString(data.status || data.statut || 'EN_ATTENTE'),
        validUntil: data.validUntil ? new Date(data.validUntil) : (data.dateValidite ? new Date(data.dateValidite) : null), // 🆕 Added field
        
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: new Date()
      };

      try {
        const existing = await db.select().from(devis).where(eq(devis.firebaseId, doc.id)).limit(1);

        if (existing.length === 0) {
          await db.insert(devis).values(newDevis);
          // console.log(`✅ Migrated Devis`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error migrating devis ${doc.id}:`, err);
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

migrateDevis();
