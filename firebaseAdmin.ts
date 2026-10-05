// firebaseAdmin.ts
import admin from "firebase-admin";
import { getApps, initializeApp, cert } from "firebase-admin/app";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export const dbAdmin = admin.firestore();
