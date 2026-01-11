
import * as admin from 'firebase-admin';
import { db } from '../src/db';
import { products } from '../src/db/schema';
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

function safeInt(val: any): number {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return parseInt(String(val), 10);
}

async function migrateProducts() {
  console.log("🚀 Starting Products Migration...");

  try {
    const snapshot = await firestore.collectionGroup('products').get();
    console.log(`📊 Found ${snapshot.size} products.`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Determine userId
      // Check path first: stores/{userId}/products/{docId}
      const pathParts = doc.ref.path.split('/');
      let ownerId = 'default_owner';
      
      if (pathParts[0] === 'stores' && pathParts.length >= 2) {
          ownerId = pathParts[1];
      } else {
          // Fallback to data or env
          ownerId = data.userId || data.storeId || process.env.FIREBASE_USER_ID || 'default_owner';
      }

      const newProduct = {
        userId: ownerId,
        firebaseId: doc.id,
        
        // Basic Info
        nom: data.nom || data.nomProduit || data.name || 'Produit Inconnu',
        reference: safeString(data.reference || data.ref),
        designation: safeString(data.designation || data.description),
        
        // Categorization (Store text/ID as is)
        categorie: safeString(data.categorie || data.category || data.categorieId),
        marque: safeString(data.marque || data.brand || data.marqueId),
        fournisseur: safeString(data.fournisseur || data.supplier),
        
        // Pricing
        prixAchat: safeDecimal(data.prixAchat || data.purchasePrice),
        prixVente: safeDecimal(data.prixVente || data.salePrice || data.price),
        prixGros: safeDecimal(data.prixGros || data.wholesalePrice),
        
        // Stock
        quantiteStock: safeInt(data.quantiteStock || data.stock || data.quantity),
        seuilAlerte: safeInt(data.seuilAlerte || data.minStock || 5),
        
        // Metadata
        description: safeString(data.description || data.desc),
        isActive: data.isActive !== false && data.archive !== true,
        
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: new Date()
      };

      try {
        // Check duplicate
        const existing = await db.select().from(products).where(eq(products.firebaseId, doc.id)).limit(1);

        if (existing.length === 0) {
          await db.insert(products).values(newProduct);
          console.log(`✅ Migrated: ${newProduct.nom}`);
          successCount++;
        } else {
          console.log(`⚠️ Skipped (Exists): ${newProduct.nom}`);
        }

      } catch (err) {
        console.error(`❌ Error migrating product ${newProduct.nom} (${doc.id}):`, err);
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

migrateProducts();
