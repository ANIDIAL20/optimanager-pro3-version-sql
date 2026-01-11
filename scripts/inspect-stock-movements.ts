
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

// Service Account
let serviceAccountPath = path.resolve(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
}

const serviceAccount = require(serviceAccountPath);

const app = initializeApp({
  credential: cert(serviceAccount)
});

const firestore = getFirestore(app);

async function inspectStockMovements() {
  console.log('\n🔍 Inspecting "stock_movements"...\n');
  try {
    const snapshot = await firestore.collectionGroup('stock_movements').limit(3).get();
    
    if (!snapshot.empty) {
        console.log(`📊 Found ${snapshot.size} movements.`);
        snapshot.docs.forEach(doc => {
            console.log(`\n🆔 ID: ${doc.id}`);
            const data = doc.data();
            console.log(`📦 Product Keys:`, {
                productId: data.productId,
                productRef: data.productRef ? 'Exists' : undefined,
                productName: data.productName
            });
            console.log(`🔄 Type:`, data.type);
            console.log(`🔢 Variant Keys:`, {
                variantId: data.variantId
            });
            console.log('📄 Data:', JSON.stringify(data, null, 2));
        });
    } else {
        console.log('⚠️ No stock movements found in collectionGroup.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
      process.exit();
  }
}

inspectStockMovements();
