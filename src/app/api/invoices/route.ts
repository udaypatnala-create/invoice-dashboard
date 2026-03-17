import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { parseExcelDate, parseCurrency } from '@/utils/dateHelpers';
import type { InvoiceRow } from '@/types/invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILES: Record<number, string> = {
  2025: "C:\\Users\\udayp\\Downloads\\Invoice-Billing-(Jan'25-Dec'25).xlsx",
  2026: "C:\\Users\\udayp\\Downloads\\Invoice-Billing-(Jan'26-Dec'26).xlsx",
};


function readFile(filePath: string, year: number): InvoiceRow[] {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = fs.readFileSync(filePath);
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    console.error('[readFile] Failed to read Excel file:', filePath, err);
    return [];
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as string[][];

  // Find header row (first row containing 'Month' AND 'Client' )
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const rowStr = raw[i].map(c => String(c ?? '').toLowerCase()).join(',');
    if (rowStr.includes('month') && rowStr.includes('client')) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = raw[headerRowIdx].map(h => String(h ?? '').trim().toLowerCase());
  const dataRows = raw.slice(headerRowIdx + 1);

  // Map header names to column indices with flexible matching
  function idx(...terms: string[]): number {
    for (const term of terms) {
      const found = headers.findIndex(h => h.includes(term.toLowerCase()));
      if (found >= 0) return found;
    }
    return -1;
  }

  const C = {
    month: idx('month'),
    client: idx('client'),
    campaign: idx('campaign', 'indian'),
    roDate: idx('ro /io', 'ro/io', 'agreement'),
    roNumber: idx('ro#', 'ro #'),
    series: idx('series'),
    ops: idx('ops'),
    status: idx('status'),
    orderId: idx('order id', 'order'),
    roAmount: idx('ro am', 'ro amount'),
    billing: idx('billing'),
    startDate: idx('start dt', 'start date', 'start'),
    endDate: idx('end date', 'end dt'),
    invDate: idx('inv date'),
    invNumber: idx('inv #', 'inv#'),
    comment: idx('comment'),
    platform: idx('platform'),
    salesContact: idx('sales'),
  };

  function get(row: string[], colIdx: number): string {
    return colIdx >= 0 ? String(row[colIdx] ?? '').trim() : '';
  }

  const rows: InvoiceRow[] = [];
  dataRows.forEach((row, di) => {
    const month = get(row, C.month);
    const clientName = get(row, C.client);
    if (!month && !clientName) return; // skip empty rows

    const roAmountRaw = get(row, C.roAmount);
    const billingAmtRaw = get(row, C.billing);
    const invDateRaw = get(row, C.invDate);
    const startDateRaw = get(row, C.startDate);
    const parsedInvDate = parseExcelDate(invDateRaw);
    const parsedStartDate = parseExcelDate(startDateRaw);

    rows.push({
      id: `${year}-${di}`,
      month,
      clientName,
      campaignName: get(row, C.campaign),
      roDate: get(row, C.roDate),
      roNumber: get(row, C.roNumber),
      series: get(row, C.series),
      opsName: get(row, C.ops),
      status: get(row, C.status),
      orderId: get(row, C.orderId),
      roAmount: parseCurrency(roAmountRaw),
      roAmountRaw,
      billingAmt: parseCurrency(billingAmtRaw),
      billingAmtRaw,
      startDate: startDateRaw,
      endDate: get(row, C.endDate),
      invDate: invDateRaw,
      invNumber: get(row, C.invNumber),
      comment: get(row, C.comment),
      platform: get(row, C.platform),
      salesContact: get(row, C.salesContact),
      year,
      invoiceDateParsed: parsedInvDate ? parsedInvDate.toISOString() : null,
      startDateParsed: parsedStartDate ? parsedStartDate.toISOString() : null,
    });
  });

  return rows;
}

function appendRowToFile(filePath: string, year: number, entry: Record<string, string>) {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = fs.readFileSync(filePath);
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    workbook = XLSX.utils.book_new();
  }

  const sheetName = workbook.SheetNames[0] ?? 'Sheet1';
  const sheet = workbook.Sheets[sheetName] ?? XLSX.utils.aoa_to_sheet([]);

  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

  // Find header row
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const rowStr = raw[i].map(c => String(c ?? '').toLowerCase()).join(',');
    if (rowStr.includes('month') && rowStr.includes('client')) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = raw[headerRowIdx];
  const newRow = headers.map(h => {
    const key = h.toLowerCase().trim();
    if (key.includes('month')) return entry.month;
    if (key.includes('client')) return entry.clientName;
    if (key.includes('campaign') || key.includes('indian')) return entry.campaignName;
    if (key.includes('ro#') || key.includes('ro #')) return entry.roNumber;
    if (key.includes('series')) return entry.series;
    if (key.includes('ops')) return entry.opsName;
    if (key.includes('status')) return entry.status;
    if (key.includes('order')) return entry.orderId;
    if (key.includes('ro am')) return entry.roAmount;
    if (key.includes('billing')) return entry.billingAmt;
    if (key.includes('start')) return entry.startDate;
    if (key.includes('end')) return entry.endDate;
    if (key.includes('inv date')) return entry.invDate;
    if (key.includes('inv #') || key.includes('inv#')) return entry.invNumber;
    if (key.includes('comment')) return entry.comment;
    if (key.includes('platform')) return entry.platform;
    if (key.includes('sales')) return entry.salesContact;
    return '';
  });

  raw.push(newRow);
  const newSheet = XLSX.utils.aoa_to_sheet(raw);
  workbook.Sheets[sheetName] = newSheet;
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(filePath, buf);
}

export async function GET() {
  const all: InvoiceRow[] = [];
  for (const [yr, filePath] of Object.entries(FILES)) {
    console.log('[GET] Reading file:', filePath);
    const rows = readFile(filePath, parseInt(yr, 10));
    console.log('[GET] Got', rows.length, 'rows for year', yr);
    all.push(...rows);
  }
  return NextResponse.json({ data: all });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const year = body.year ? parseInt(body.year, 10) : 2026;
  const filePath = FILES[year] ?? FILES[2026];
  try {
    appendRowToFile(filePath, year, body);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
