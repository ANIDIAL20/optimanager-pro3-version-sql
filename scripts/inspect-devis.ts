
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

async function inspectDevis() {
  console.log('\n🔍 Inspecting "devis"...\n');
  try {
    const snapshot = await firestore.collectionGroup('devis').limit(3).get();
    
    if (!snapshot.empty) {
        console.log(`📊 Found ${snapshot.size} sample devis.`);
        snapshot.docs.forEach(doc => {
            console.log(`\n🆔 ID: ${doc.id}`);
            const data = doc.data();
            console.log(`👤 Client Keys:`, {
                clientId: data.clientId,
                clientRef: data.clientRef ? 'Exists' : undefined,
                clientName: data.clientName
            });
            console.log(`🔗 Sale Keys:`, {
                saleId: data.saleId,
                cmdId: data.cmdId,
                commandeId: data.commandeId
            });
            console.log(`💰 Total:`, data.totalTTC || data.total);
            console.log('📄 Data:', JSON.stringify(data, null, 2));
        });
    } else {
        console.log('⚠️ No devis found in collectionGroup.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
      process.exit();
  }
}

inspectDevis();
