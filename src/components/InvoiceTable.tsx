'use client';
import React, { useState } from 'react';
import type { InvoiceRow } from '@/types/invoice';
import { formatINR, formatDate } from '@/utils/dateHelpers';

interface InvoiceTableProps {
  rows: InvoiceRow[];
}

const statusColors: Record<string, string> = {
  'Completed': 'bg-green-100 text-green-700',
  'Running': 'bg-blue-100 text-blue-700',
  'Invoice Raised': 'bg-purple-100 text-purple-700',
  'PO Received': 'bg-yellow-100 text-yellow-700',
};

const COLS = [
  { label: 'Month', key: 'month' },
  { label: 'Client', key: 'clientName' },
  { label: 'Campaign', key: 'campaignName' },
  { label: 'RO #', key: 'roNumber' },
  { label: 'Ops', key: 'opsName' },
  { label: 'Status', key: 'status' },
  { label: 'RO Amount', key: 'roAmount' },
  { label: 'Billing Amt', key: 'billingAmt' },
  { label: 'Inv Date', key: 'invDate' },
  { label: 'Inv #', key: 'invNumber' },
  { label: 'Platform', key: 'platform' },
  { label: 'Sales Contact', key: 'salesContact' },
];

export default function InvoiceTable({ rows }: InvoiceTableProps) {
  const [sortKey, setSortKey] = useState<string>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      r.clientName.toLowerCase().includes(q) ||
      r.campaignName.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.roNumber.toLowerCase().includes(q) ||
      r.salesContact.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortKey];
    const bv = (b as unknown as Record<string, unknown>)[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    return sortDir === 'asc'
      ? String(av ?? '').localeCompare(String(bv ?? ''))
      : String(bv ?? '').localeCompare(String(av ?? ''));
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function formatCell(row: InvoiceRow, key: string): React.ReactNode {
    if (key === 'roAmount' || key === 'billingAmt') {
      const v = (row as unknown as Record<string, unknown>)[key] as number;
      return v > 0 ? formatINR(v) : '-';
    }
    if (key === 'status') {
      const s = row.status || 'Unknown';
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[s] ?? 'bg-gray-100 text-gray-500'}`}>
          {s}
        </span>
      );
    }
    if (key === 'invDate') {
      return row.invoiceDateParsed
        ? formatDate(new Date(row.invoiceDateParsed))
        : row.invDate || '-';
    }
    return String((row as unknown as Record<string, unknown>)[key] ?? '') || '-';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <input
          type="text"
          placeholder="Search by client, campaign, status, sales contact..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length} records</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm bg-white">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-10 text-center text-gray-400">
                  No records found
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30`}
                >
                  {COLS.map(col => (
                    <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatCell(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 bg-white hover:bg-blue-50 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 bg-white hover:bg-blue-50 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
