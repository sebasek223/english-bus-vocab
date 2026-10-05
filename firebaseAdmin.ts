// firebaseAdmin.ts
// Optional server-side Firebase Admin configuration
let dbAdmin: any = null;

try {
  const admin = require("firebase-admin");
  const { getApps, initializeApp, cert } = require("firebase-admin/app");

  if (!getApps().length && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
  dbAdmin = admin.firestore ? admin.firestore() : null;
} catch (e) {
  // Silent fallback when firebase-admin is not installed in production
}

export { dbAdmin };
