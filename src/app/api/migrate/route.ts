import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

// We import the previous iteration of the Excel logic we saved!
import { GET as getOldInvoices } from '@/scripts/oldRoute8';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[MIGRATE] API endpoint hit, starting background migration...');

  // Run the massive Excel parse + network Firebase upload asynchronously in the background
  // to explicitly avoid locking the browser up until timeout!
  (async () => {
    try {
      console.log('[MIGRATE-BG] Fetching data internally from old Excel logic...');
      
      const response = await getOldInvoices();
      const { data } = await response.json();
      console.log(`[MIGRATE-BG] Parsed ${data.length} records from Excel. Uploading to Firestore...`);

      let count = 0;
      const batchSize = 400; // max 500
      const invRef = collection(db, 'invoices');

      for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const batch = writeBatch(db);

        chunk.forEach((row: any) => {
          const newDoc = doc(invRef);
          batch.set(newDoc, { ...row, migratedAt: new Date().toISOString() });
          count++;
        });

        await batch.commit();
        console.log(`[MIGRATE-BG] Committed batch of ${chunk.length} (Total: ${count})`);
      }

      console.log('[MIGRATE-BG] ✨ MIGRATION TOTALLY SUCCESSFUL! ✨');
    } catch (error: any) {
      console.error('[MIGRATE-BG] ERROR:', error);
    }
  })();

  return NextResponse.json({ 
    success: true, 
    status: 'Migration has officially kicked off in the background! Please look at your server terminal to track the precise progress, it takes roughly 30 seconds.' 
  });
}
