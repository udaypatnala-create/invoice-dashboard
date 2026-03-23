export interface InvoiceRow {
  id: string;
  month: string;
  clientName: string;
  campaignName: string;
  roDate: string;
  roNumber: string;
  series: string;
  opsName: string;
  status: string;
  orderId: string;
  roAmount: number;
  roAmountRaw: string;
  billingAmt: number;
  billingAmtRaw: string;
  // New Foreign Campaign fields
  currency: string;
  xFactor: number;
  exchangeRate: number;
  inrRoAmount: number;
  inrBillingAmt: number;
  inrBillingAmtRaw: string;
  // New Editing field
  billingStatus: string;
  startDate: string;
  endDate: string;
  invDate: string;
  invNumber: string;
  comment: string;
  platform: string;
  salesContact: string;
  year: number;
  sheetTab: SheetTab;
  invoiceDateParsed: string | null;
  startDateParsed: string | null;
}

export type SheetTab =
  | 'india'
  | 'foreign'
  | 'google_networks'
  | 'pg_sales';

export const TAB_LABELS: Record<SheetTab, string> = {
  india: '🇮🇳 India Campaigns',
  foreign: '🌍 Foreign Campaigns',
  google_networks: '🌐 Google & Networks',
  pg_sales: '💻 PG Sales/FC',
};
