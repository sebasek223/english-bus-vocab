// firebaseClient.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

// Initialize Firebase only once
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

export const auth = getAuth();
export const db = getFirestore();
