
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

async function inspectSales() {
  console.log('\n🔍 Inspecting "sales"...\n');
  try {
    // Check collectionGroup (most likely nested under stores)
    const snapshot = await firestore.collectionGroup('sales').limit(3).get();
    
    if (!snapshot.empty) {
        console.log(`📊 Found ${snapshot.size} sample sales.`);
        snapshot.docs.forEach(doc => {
            console.log(`\n🆔 ID: ${doc.id}`);
            console.log(`📍 Path: ${doc.ref.path}`);
            const data = doc.data();
            console.log(`👤 Client Keys:`, {
                clientId: data.clientId,
                clientRef: data.clientRef ? 'Exists' : undefined,
                clientName: data.clientName,
                client: data.client ? 'Exists' : undefined
            });
            console.log(`🛒 Items:`, Array.isArray(data.items) ? `${data.items.length} items` : 'Not Array');
            console.log(`💰 Total:`, data.total || data.totalTTC || data.totalNet);
            // Log full data for analysis
            console.log('📄 Data:', JSON.stringify(data, null, 2));
        });
    } else {
        console.log('⚠️ No sales found in collectionGroup.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
      process.exit();
  }
}

inspectSales();
