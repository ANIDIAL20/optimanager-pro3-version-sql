import * as admin from 'firebase-admin';
import { db } from '../src/db';
import { clients } from '../src/db/schema';
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

// 🛠️ Helper function bach n-nettoyew Data (Anti-Undefined)
function safeString(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

function safeDecimal(val: any): string {
  if (val === undefined || val === null || val === '' || isNaN(val)) return '0';
  return String(val);
}

async function migrateClients() {
  console.log("🚀 Bdina Migration (Version Robuste)...");

  try {
    // 🔥 UPDATED: Flat structure support
    // Kan-checkiw wach kayna collection root "clients"
    console.log("🔍 Checking root 'clients' collection...");
    let snapshot = await firestore.collection('clients').get();
    
    // Ila mal9inach f root, n-checkiw collectionGroup (cas où structure mixte)
    if (snapshot.empty) {
        console.log("⚠️ Root 'clients' khawya, kan-jarreb collectionGroup...");
        const groupSnapshot = await firestore.collectionGroup('clients').get();
        if (!groupSnapshot.empty) {
            console.log(`✅ L9ina ${groupSnapshot.size} clients f subcollections.`);
            snapshot = groupSnapshot;
        }
    }

    console.log(`📊 L9ina ${snapshot.size} clients (Root).`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // 🛠️ CRITICAL FIX: Extract UserID from Data NOT Path
      // Path kaykon: clients/DOC_ID -> pathParts[1] is docId (Wrong!)
      // Correct: data.userId OR data.storeId OR Environment Fallback
      const ownerId = 
        data.userId || 
        data.storeId || 
        data.ownerId || 
        data.uid || // Cas où c'est User Auth?
        process.env.FIREBASE_USER_ID || // Fallback .env
        'default_store_owner';

      // Transform & Sanitize Data

      // Transform & Sanitize Data
      const newClient = {
        userId: ownerId,
        firebaseId: doc.id,
        // Dima 3ti valeur par défaut (Fallback)
        fullName: data.nom_complet || data.fullName || data.name || 'Client Inconnu',
        
        // 🛡️ Protection contre 'undefined'
        email: safeString(data.email),
        phone: safeString(data.telephone || data.phone || data.tel),
        address: safeString(data.adresse || data.address),
        city: safeString(data.ville || data.city),
        notes: safeString(data.remarque || data.notes),
        
        // Ar9am khasshom ykouno String ('0' machi undefined)
        balance: safeDecimal(data.solde || data.balance),
        totalSpent: safeDecimal(data.total || data.totalSpent),
        
        isActive: data.archive !== true,
        
        // Dates
        lastVisit: data.lastVisit?.toDate ? data.lastVisit.toDate() : null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: new Date() // Nzidou updated at
      };

      try {
        // Check doublon (Use db.select instead of db.query for stability)
        const existing = await db.select().from(clients).where(eq(clients.firebaseId, doc.id)).limit(1);

        if (existing.length === 0) {
          await db.insert(clients).values(newClient);
          console.log(`✅ Client migré: ${newClient.fullName}`);
          successCount++;
        } else {
          console.log(`⚠️ Déjà kayn: ${newClient.fullName}`);
        }

      } catch (err) {
        // Hna ghan-affichiw l'erreur m3a l'client bach n3erfo chkon
        console.error(`❌ Erreur f client ${newClient.fullName} (${doc.id}):`, err);
        errorCount++;
      }
    }

    console.log("\n============================================================");
    console.log(`✅ Résultat Final:`);
    console.log(`   - Succès: ${successCount}`);
    console.log(`   - Erreurs: ${errorCount}`);
    console.log("============================================================");

  } catch (error) {
    console.error("❌ Mouchkil kbir:", error);
  } finally {
      process.exit();
  }
}

migrateClients();
