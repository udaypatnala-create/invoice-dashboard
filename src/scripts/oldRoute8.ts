import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { parseExcelDate, parseCurrency } from '@/utils/dateHelpers';
import type { InvoiceRow, SheetTab } from '@/types/invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILES: Record<number, string> = {
  2025: "C:\\Users\\udayp\\Downloads\\Invoice-Billing-(Jan'25-Dec'25).xlsx",
  2026: "C:\\Users\\udayp\\Downloads\\Invoice-Billing-(Jan'26-Dec'26).xlsx",
};

// Sheet name ΓåÆ SheetTab mapping (handles both 2025 and 2026 naming)
const SHEET_TAB_MAP: Record<string, SheetTab> = {
  'india campaigns': 'india',
  'indian campaigns': 'india',
  'foreign campaigns': 'foreign',
  'google & networks': 'google_networks',
  'pg sales- fc-inr-usd-report': 'pg_sales',
  'pg sales': 'pg_sales',
  'pg deals': 'pg_deals',
};

function forwardFillMergedCells(raw: string[][], sheet: XLSX.WorkSheet): string[][] {
  const merges: XLSX.Range[] = sheet['!merges'] ?? [];
  const filled = raw.map(r => [...r]);
  for (const merge of merges) {
    const startRow = merge.s.r;
    const startCol = merge.s.c;
    const endRow = merge.e.r;
    const endCol = merge.e.c;
    const value = filled[startRow]?.[startCol] ?? '';
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (filled[r]) filled[r][c] = value;
      }
    }
  }
  return filled;
}

function readSheet(
  sheet: XLSX.WorkSheet,
  sheetTab: SheetTab,
  year: number,
  sheetName: string,
  idPrefix: string
): InvoiceRow[] {
  const rawBase: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as string[][];

  const raw = forwardFillMergedCells(rawBase, sheet);

  // Find header row (contains 'month' AND ('client' or 'network' or 'order'))
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(6, raw.length); i++) {
    const rowStr = raw[i].map(c => String(c ?? '').toLowerCase()).join(',');
    if (rowStr.includes('month') && (rowStr.includes('client') || rowStr.includes('network') || rowStr.includes('order'))) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx < 0) return [];

  const headers = raw[headerRowIdx].map(h => String(h ?? '').trim().toLowerCase());
  const dataRows = raw.slice(headerRowIdx + 1);

  function idx(...terms: string[]): number {
    for (const term of terms) {
      const found = headers.findIndex(h => h.includes(term.toLowerCase()));
      if (found >= 0) return found;
    }
    return -1;
  }

  // Build column index map depending on sheet type
  let C: Record<string, number>;

  if (sheetTab === 'google_networks') {
    C = {
      month: idx('month'),
      client: idx('network'),
      campaign: idx('revenue (foreign)'),
      roAmount: idx('revenue amount(inr)', 'revenue amount'),
      billing: idx('billing'),
      status: -1,
      ops: -1,
      roNumber: -1,
      series: -1,
      orderId: -1,
      startDate: -1,
      endDate: -1,
      invDate: -1,
      invNumber: -1,
      comment: -1,
      platform: -1,
      salesContact: -1,
    };
  } else if (sheetTab === 'pg_sales') {
    C = {
      month: idx('month and year', 'month'),
      client: idx('programmatic buyer', 'client'),
      campaign: idx('order', 'campaign'),
      roAmount: idx('revenue(usd)', 'revenue (usd)'),
      billing: idx('revenue(inr)', 'revenue (inr)'),
      status: -1,
      ops: -1,
      roNumber: -1,
      series: -1,
      orderId: idx('order'),
      startDate: -1,
      endDate: -1,
      invDate: -1,
      invNumber: -1,
      comment: -1,
      platform: -1,
      salesContact: -1,
    };
  } else if (sheetTab === 'pg_deals') {
    C = {
      month: idx('month'),
      client: idx('client'),
      campaign: idx('campaign'),
      ops: idx('ops'),
      roAmount: idx('revenue', 'amount'),
      billing: idx('billing'),
      status: idx('status'),
      roNumber: -1,
      series: -1,
      orderId: -1,
      startDate: -1,
      endDate: -1,
      invDate: -1,
      invNumber: -1,
      comment: -1,
      platform: -1,
      salesContact: idx('sales'),
    };
  } else {
    // India and Foreign Campaigns
    C = {
      month: idx('month'),
      client: idx('client'),
      campaign: idx('campaign', 'indian campaign'),
      roDate: idx('ro /io', 'ro/io', 'ro date', 'agreement'),
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
  }

  function get(row: string[], colIdx: number): string {
    return colIdx >= 0 ? String(row[colIdx] ?? '').trim() : '';
  }

  const rows: InvoiceRow[] = [];
  dataRows.forEach((row, di) => {
    const month = get(row, C.month);
    const clientName = get(row, C.client);
    if (!month && !clientName) return;

    const roAmountRaw = get(row, C.roAmount);
    const billingAmtRaw = get(row, C.billing);
    const invDateRaw = get(row, C.invDate ?? -1);
    const startDateRaw = get(row, C.startDate ?? -1);

    // Parse month: may be a date serial or text
    let monthStr = month;
    const serial = parseInt(month, 10);
    if (!isNaN(serial) && serial > 40000 && serial < 60000) {
      const d = parseExcelDate(month);
      if (d) {
        monthStr = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }
    }

    const parsedInvDate = parseExcelDate(invDateRaw);
    const parsedStartDate = parseExcelDate(startDateRaw);

    rows.push({
      id: `${idPrefix}-${di}`,
      month: monthStr,
      clientName,
      campaignName: get(row, C.campaign ?? -1),
      roDate: get(row, C.roDate ?? -1),
      roNumber: get(row, C.roNumber ?? -1),
      series: get(row, C.series ?? -1),
      opsName: get(row, C.ops ?? -1),
      status: get(row, C.status ?? -1),
      orderId: get(row, C.orderId ?? -1),
      roAmount: parseCurrency(roAmountRaw),
      roAmountRaw,
      billingAmt: parseCurrency(billingAmtRaw),
      billingAmtRaw,
      startDate: startDateRaw,
      endDate: get(row, C.endDate ?? -1),
      invDate: invDateRaw,
      invNumber: get(row, C.invNumber ?? -1),
      comment: get(row, C.comment ?? -1),
      platform: get(row, C.platform ?? -1),
      salesContact: get(row, C.salesContact ?? -1),
      year,
      sheetTab,
      invoiceDateParsed: parsedInvDate ? parsedInvDate.toISOString() : null,
      startDateParsed: parsedStartDate ? parsedStartDate.toISOString() : null,
    });
  });

  return rows;
}

function readAllSheets(filePath: string, year: number): InvoiceRow[] {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = fs.readFileSync(filePath);
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    console.error('[readAllSheets] Cannot read file:', filePath, err);
    return [];
  }

  const all: InvoiceRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const tabKey = sheetName.toLowerCase().trim();
    const sheetTab = SHEET_TAB_MAP[tabKey];
    if (!sheetTab) continue; // skip unmapped sheets

    const sheet = workbook.Sheets[sheetName];
    const prefix = `${year}-${sheetTab}`;
    const rows = readSheet(sheet, sheetTab, year, sheetName, prefix);
    all.push(...rows);
  }
  return all;
}

function appendRowToSheet(filePath: string, sheetTab: SheetTab, entry: Record<string, string>) {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = fs.readFileSync(filePath);
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    workbook = XLSX.utils.book_new();
  }

  // Find the right sheet
  const targetSheetName = workbook.SheetNames.find(n => {
    const key = n.toLowerCase().trim();
    return SHEET_TAB_MAP[key] === sheetTab;
  }) ?? workbook.SheetNames[0];

  const sheet = workbook.Sheets[targetSheetName] ?? XLSX.utils.aoa_to_sheet([]);
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(6, raw.length); i++) {
    const rowStr = raw[i].map(c => String(c ?? '').toLowerCase()).join(',');
    if (rowStr.includes('month') && (rowStr.includes('client') || rowStr.includes('network'))) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = raw[headerRowIdx];
  const newRow = headers.map(h => {
    const key = h.toLowerCase().trim();
    if (key.includes('month')) return entry.month;
    if (key.includes('client') || key.includes('programmatic')) return entry.clientName;
    if (key.includes('campaign') || key.includes('indian') || key.includes('order')) return entry.campaignName;
    if (key.includes('ro#') || key.includes('ro #')) return entry.roNumber;
    if (key.includes('series')) return entry.series;
    if (key.includes('ops')) return entry.opsName;
    if (key.includes('status')) return entry.status;
    if (key.includes('order id')) return entry.orderId;
    if (key.includes('ro am') || key.includes('ro amount')) return entry.roAmount;
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
  workbook.Sheets[targetSheetName] = newSheet;
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(filePath, buf);
}

// PATCH: update a row in the Excel file (for inline edit of inv date/number)
function updateRowInSheet(
  filePath: string,
  sheetTab: SheetTab,
  rowId: string,
  updates: Record<string, string>
) {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = fs.readFileSync(filePath);
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    throw new Error(`Cannot read file: ${err}`);
  }

  const targetSheetName = workbook.SheetNames.find(n => {
    const key = n.toLowerCase().trim();
    return SHEET_TAB_MAP[key] === sheetTab;
  }) ?? workbook.SheetNames[0];

  const sheet = workbook.Sheets[targetSheetName];
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as string[][];

  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(6, raw.length); i++) {
    const rowStr = raw[i].map(c => String(c ?? '').toLowerCase()).join(',');
    if (rowStr.includes('month') && (rowStr.includes('client') || rowStr.includes('network'))) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = raw[headerRowIdx].map(h => String(h ?? '').trim().toLowerCase());

  // Row id format: "YEAR-SHEETAB-INDEX"
  const parts = rowId.split('-');
  const rowIdx = parseInt(parts[parts.length - 1], 10);
  const dataRow = raw[headerRowIdx + 1 + rowIdx];
  if (!dataRow) throw new Error(`Row not found: ${rowId}`);

  for (const [field, value] of Object.entries(updates)) {
    let colIdx = -1;
    if (field === 'invDate') colIdx = headers.findIndex(h => h.includes('inv date'));
    if (field === 'invNumber') colIdx = headers.findIndex(h => h.includes('inv #') || h.includes('inv#'));
    if (field === 'status') colIdx = headers.findIndex(h => h.includes('status'));
    if (colIdx >= 0) dataRow[colIdx] = value;
  }

  const newSheet = XLSX.utils.aoa_to_sheet(raw);
  workbook.Sheets[targetSheetName] = newSheet;
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(filePath, buf);
}

export async function GET() {
  const all: InvoiceRow[] = [];
  for (const [yr, filePath] of Object.entries(FILES)) {
    console.log('[GET] Reading file:', filePath);
    const rows = readAllSheets(filePath, parseInt(yr, 10));
    console.log('[GET] Got', rows.length, 'rows from', filePath);
    all.push(...rows);
  }
  return NextResponse.json({ data: all });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const year = body.year ? parseInt(body.year, 10) : 2026;
  const filePath = FILES[year] ?? FILES[2026];
  const sheetTab: SheetTab = body.sheetTab ?? 'india';
  try {
    appendRowToSheet(filePath, sheetTab, body);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { rowId, year, sheetTab, updates } = body;
  const filePath = FILES[year] ?? FILES[2026];
  try {
    updateRowInSheet(filePath, sheetTab, rowId, updates);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
