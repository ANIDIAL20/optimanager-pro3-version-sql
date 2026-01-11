import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// Use environment variables directly instead of hardcoded config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// DEBUG: Check if env vars are loaded
console.log("🔍 Firebase Config Debug:");
console.log("API Key:", firebaseConfig.apiKey ? `✅ ${firebaseConfig.apiKey.substring(0, 10)}...` : "❌ MISSING");
console.log("Auth Domain:", firebaseConfig.authDomain || "❌ MISSING");
console.log("Project ID:", firebaseConfig.projectId || "❌ MISSING");

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

export { app, auth, db };
