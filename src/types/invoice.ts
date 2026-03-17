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
  startDate: string;
  endDate: string;
  invDate: string;
  invNumber: string;
  comment: string;
  platform: string;
  salesContact: string;
  year: number;
  // parsed ISO dates for filtering
  invoiceDateParsed: string | null; // ISO string
  startDateParsed: string | null;
}
