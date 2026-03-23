import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBG57We0FB5DRZnQOmopQ0TOF11kTtx6GU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "invoice-sheet-3b477.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "invoice-sheet-3b477",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "invoice-sheet-3b477.firebasestorage.app",
  messagingSenderId: "422591357443",
  appId: "1:422591357443:web:4077038e5670ef5ca9a436"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function delete2025() {
  console.log("Starting deletion of 2025 data...");
  const q = query(collection(db, 'invoices'), where("year", "==", 2025));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log("No 2025 records found.");
    return;
  }
  
  console.log(`Found ${snapshot.docs.length} records. Deleting...`);
  
  const batchArray = [];
  batchArray.push(writeBatch(db));
  let operationCounter = 0;
  let batchIndex = 0;
  
  snapshot.docs.forEach((document) => {
    batchArray[batchIndex].delete(document.ref);
    operationCounter++;

    if (operationCounter === 400) {
      batchArray.push(writeBatch(db));
      batchIndex++;
      operationCounter = 0;
    }
  });

  for (const batch of batchArray) {
    await batch.commit();
  }
  
  console.log(`Successfully deleted ${snapshot.docs.length} records from 2025!`);
}

delete2025().catch(console.error);
