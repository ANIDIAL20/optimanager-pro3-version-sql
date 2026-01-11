
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

async function inspectPrescriptions() {
  console.log('\n🔍 Inspecting "prescriptions"...\n');
  try {
    // 1. Root check
    const rootSnapshot = await firestore.collection('prescriptions').limit(2).get();
    if (!rootSnapshot.empty) {
        console.log('--- ROOT PRESCRIPTIONS ---');
        rootSnapshot.docs.forEach(doc => {
            console.log(`ID: ${doc.id}`);
            console.log(`Path: ${doc.ref.path}`);
            console.log('Data:', JSON.stringify(doc.data(), null, 2));
        });
    } else {
        console.log('⚠️ No prescriptions in root.');
    }

    // 2. Group check (likely scenario)
    const groupSnapshot = await firestore.collectionGroup('prescriptions').limit(2).get();
    if (!groupSnapshot.empty) {
        console.log('\n--- GROUP PRESCRIPTIONS (Subcollections) ---');
        groupSnapshot.docs.forEach(doc => {
            console.log(`ID: ${doc.id}`);
            console.log(`Path: ${doc.ref.path}`);
            console.log('Data:', JSON.stringify(doc.data(), null, 2));
        });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
      process.exit();
  }
}

inspectPrescriptions();
