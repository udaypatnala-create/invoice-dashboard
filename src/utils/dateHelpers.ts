// Parses a date string from Excel in various formats into a JS Date object
export function parseExcelDate(raw: string | number | undefined | null): Date | null {
  if (!raw) return null;

  const rawStr = String(raw).trim();

  // Excel serial number (e.g. 42943)
  if (/^\d{5}$/.test(rawStr)) {
    const serial = parseInt(rawStr, 10);
    // Excel epoch: Jan 0, 1900 = serial 0
    const utc = (serial - 25569) * 86400 * 1000;
    const d = new Date(utc);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY or D/M/YYYY
  const dmY = rawStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmY) {
    const [, d, m, y] = dmY;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(date.getTime())) return date;
  }

  // MM/DD/YYYY or M/D/YYYY (only if day > 12)
  const mdY = rawStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdY) {
    const [, m, d, y] = mdY;
    if (parseInt(d, 10) > 12) {
        const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        if (!isNaN(date.getTime())) return date;
    }
  }

  // ISO or "YYYY-MM-DD"
  const fallback = new Date(rawStr);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

export function formatDate(d: Date | null): string {
  if (!d) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Parses "₹ 3,75,000.00" or "$17,500.00" or plain numbers into a number
export function parseCurrency(raw: string | number | undefined | null): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw)
    .replace(/[₹$,\s]/g, '')
    .trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Format number as INR currency
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export type TimeFilter =
  | 'this_month'
  | 'last_month'
  | { month: number; year: number }
  | { from: Date; to: Date };

export function isInRange(date: Date | null, filter: TimeFilter): boolean {
  if (!date) return false;
  const now = new Date();

  if (filter === 'this_month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }

  if (filter === 'last_month') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getMonth() === last.getMonth() && date.getFullYear() === last.getFullYear();
  }

  if ('month' in filter && 'year' in filter) {
    return date.getMonth() === filter.month && date.getFullYear() === filter.year;
  }

  if ('from' in filter && 'to' in filter) {
    return date >= filter.from && date <= filter.to;
  }

  return true;
}
