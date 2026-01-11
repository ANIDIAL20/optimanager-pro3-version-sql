
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

// Try to find the service account file
let serviceAccountPath = path.resolve(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.warn(`Original service account path not found: ${serviceAccountPath}`);
    // Fallback to searching in root
    serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
}

console.log(`Using service account: ${serviceAccountPath}`);

const serviceAccount = require(serviceAccountPath);

const app = initializeApp({
  credential: cert(serviceAccount)
});

const firestore = getFirestore(app);

async function inspectProducts() {
  console.log('\n🔍 Inspecting "products" collection...\n');
  try {
    // 1. Check Root Collection
    const rootSnapshot = await firestore.collection('products').limit(1).get();
    
    if (!rootSnapshot.empty) {
        console.log('--- ROOT PRODUCT SAMPLE ---');
        const doc = rootSnapshot.docs[0];
        console.log(JSON.stringify(doc.data(), null, 2));
    } else {
        console.log('No products in root.');
        const groupSnapshot = await firestore.collectionGroup('products').limit(1).get();
        if(!groupSnapshot.empty) {
           console.log('--- GROUP PRODUCT SAMPLE ---');
           console.log(JSON.stringify(groupSnapshot.docs[0].data(), null, 2));
        }
    }

  } catch (error) {
    console.error('❌ Error inspecting products:', error);
  } finally {
      // Need to close app? Firebase Admin SDK doesn't always need explicit close in scripts but node might hang
      // process.exit() is cleaner for scripts
      process.exit();
  }
}

inspectProducts();
