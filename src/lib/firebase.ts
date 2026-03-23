import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBG57We0FB5DRZnQOmopQ0TOF11kTtx6GU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "invoice-sheet-3b477.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "invoice-sheet-3b477",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "invoice-sheet-3b477.firebasestorage.app",
  messagingSenderId: "422591357443",
  appId: "1:422591357443:web:4077038e5670ef5ca9a436",
  measurementId: "G-9XZMEH0PE1"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
