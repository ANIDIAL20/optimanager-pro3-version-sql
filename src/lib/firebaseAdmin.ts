import admin from "firebase-admin";

// 1. Debugging: نتحقق واش المتغيرات وصلو ولا لا
console.log("-----------------------------------------");
console.log("DEBUG ENVIRONMENT VARIABLES:");
console.log(
  "FIREBASE_PROJECT_ID:",
  process.env.FIREBASE_PROJECT_ID
    ? "✅ Exists (" + process.env.FIREBASE_PROJECT_ID + ")"
    : "❌ MISSING"
);
console.log(
  "FIREBASE_CLIENT_EMAIL:",
  process.env.FIREBASE_CLIENT_EMAIL ? "✅ Exists" : "❌ MISSING"
);
console.log(
  "FIREBASE_PRIVATE_KEY:",
  process.env.FIREBASE_PRIVATE_KEY ? "✅ Exists" : "❌ MISSING"
);
console.log("-----------------------------------------");

if (!admin.apps.length) {
  // 2. التحقق قبل البدء
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      "❌ One or more Firebase Environment Variables are MISSING in Vercel!"
    );
  }

  try {
    // 3. معالجة الـ Private Key بطريقة ذكية
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // إذا كان فيه \\n (escaped newlines)، نبدلوهم بـ newlines حقيقية
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    // نتحققو واش الـ private key صحيح (يبدا بـ BEGIN ويخلص بـ END)
    if (
      !privateKey.includes("BEGIN PRIVATE KEY") ||
      !privateKey.includes("END PRIVATE KEY")
    ) {
      throw new Error(
        "❌ FIREBASE_PRIVATE_KEY is not properly formatted. It should start with '-----BEGIN PRIVATE KEY-----' and end with '-----END PRIVATE KEY-----'"
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("✅ Firebase Admin Initialized Successfully");
  } catch (error) {
    console.error("❌ Firebase Admin Initialization Error:", error);
    throw error; // حبس الـ Build هنا باش ما نكملوش بالغلط
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
