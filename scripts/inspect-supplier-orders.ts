
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

async function inspectSupplierOrders() {
  console.log('\n🔍 Inspecting "supplier_orders"...\n');
  try {
    const snapshot = await firestore.collectionGroup('supplier_orders').limit(3).get();
    
    if (!snapshot.empty) {
        console.log(`📊 Found ${snapshot.size} sample orders.`);
        snapshot.docs.forEach(doc => {
            console.log(`\n🆔 ID: ${doc.id}`);
            const data = doc.data();
            console.log(`🏭 Fournisseur:`, data.fournisseur);
            console.log(`💰 Total:`, data.montantTotal);
            console.log(`🛒 Items:`, data.items?.length);
            console.log('📄 Data:', JSON.stringify(data, null, 2));
        });
    } else {
        console.log('⚠️ No supplier orders found in collectionGroup.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
      process.exit();
  }
}

inspectSupplierOrders();
