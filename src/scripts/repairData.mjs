import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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

function extractCurrency(raw) {
  if (!raw) return null;
  const s = String(raw).toUpperCase();
  if (s.includes('USD') || s.includes('$')) return 'USD';
  if (s.includes('CAD')) return 'CAD';
  if (s.includes('GBP') || s.includes('£')) return 'GBP';
  if (s.includes('EUR') || s.includes('€')) return 'EUR';
  if (s.includes('AUD')) return 'AUD';
  if (s.includes('AED')) return 'AED';
  if (s.includes('SGD')) return 'SGD';
  if (s.includes('INR') || s.includes('₹')) return 'INR';
  return null;
}

function extractNumber(raw) {
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[^0-9.-]+/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

async function run() {
  const snapshot = await getDocs(collection(db, 'invoices'));
  let updatedCount = 0;
  
  for (const document of snapshot.docs) {
    const data = document.data();
    const updates = {};
    
    // Attempt mapping the raw values safely
    const roVal = extractNumber(data.roAmountRaw || data.roAmount);
    const billVal = extractNumber(data.billingAmtRaw || data.billingAmt);
    let curr = extractCurrency(data.roAmountRaw) || extractCurrency(data.billingAmtRaw) || data.currency || '';
    
    // Explicitly fallback if not found
    if (!curr && data.sheetTab !== 'foreign' && data.sheetTab !== 'pg_sales' && data.sheetTab !== 'google_networks') {
        curr = 'INR';
    }

    const xf = extractNumber(data.xFactor) || 1;
    
    // Overwrite the wrong defaults
    updates.roAmount = roVal;
    updates.billingAmt = billVal;
    updates.currency = curr;
    updates.inrRoAmount = curr === 'INR' ? roVal : (roVal * xf);
    updates.inrBillingAmt = curr === 'INR' ? billVal : (billVal * xf);
    
    // Update document
    await updateDoc(doc(db, 'invoices', document.id), updates);
    updatedCount++;
  }
  
  console.log(`Repaired ${updatedCount} records successfully!`);
}

run().catch(console.error);
