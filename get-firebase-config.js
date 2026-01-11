/**
 * Firebase Client Configuration Finder
 * 
 * This guide will help you get the CORRECT Firebase Web App configuration
 * from your Firebase Console.
 * 
 * IMPORTANT: The API key must match your Firebase project's web app configuration!
 */

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  How to Get Your Correct Firebase Web App Configuration         ║
╚══════════════════════════════════════════════════════════════════╝

📋 STEP-BY-STEP INSTRUCTIONS:

1. Open Firebase Console:
   👉 https://console.firebase.google.com/

2. Select your project:
   "optimanager-pro-3-34449"

3. Click the ⚙️ Settings icon → "Project settings"

4. Scroll down to "Your apps" section

5. Look for your WEB APP (🌐 icon)
   - If you see a web app, click on it to see the config
   - If you DON'T see a web app, you need to create one:
     a. Click "Add app" button
     b. Select the WEB icon (</>) 
     c. Give it a name (e.g., "OptiManager Web")
     d. Click "Register app"

6. You'll see a "firebaseConfig" object like this:

   const firebaseConfig = {
     apiKey: "AIza...",              ← COPY THIS
     authDomain: "your-project.firebaseapp.com",
     projectId: "optimanager-pro-3-34449",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123",
     measurementId: "G-XXXXXXXXXX"
   };

7. Copy ALL these values and replace them in your .env.local file

═══════════════════════════════════════════════════════════════════

⚠️  COMMON MISTAKES:

❌ Using the wrong API key from a different project
❌ Using the Google Cloud API key instead of Firebase Web API key
❌ Not creating a web app in Firebase Console
❌ Mixing up values from different Firebase apps

✅ CORRECT: Use the exact values from your Firebase Web App config

═══════════════════════════════════════════════════════════════════
`);
