import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const colRef = collection(db, 'invoices');
    const snapshot = await getDocs(colRef);
    const all = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return NextResponse.json({ data: all });
  } catch (error: any) {
    console.error('[GET] Firebase error:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const colRef = collection(db, 'invoices');
    await addDoc(colRef, {
      ...body,
      createdAt: new Date().toISOString()
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { rowId, updates } = body;
    const docRef = doc(db, 'invoices', rowId);
    await updateDoc(docRef, updates);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
