'use client';
import React, { useState } from 'react';
import type { InvoiceRow, SheetTab } from '@/types/invoice';
import { formatINR, formatDate } from '@/utils/dateHelpers';
import NewEntryModal from './NewEntryModal';

interface InvoiceTableProps {
  rows: InvoiceRow[];
  activeTab: SheetTab | 'summary';
  onRowUpdated: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Completed': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'Stopped': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'Running': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  'Invoice Raised': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'PO Received': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
};

const BASE_COLS = [
  { label: 'Month', key: 'month' },
  { label: 'Client', key: 'clientName' },
  { label: 'Campaign', key: 'campaignName' },
  { label: 'RO #', key: 'roNumber' },
  { label: 'Ops', key: 'opsName' },
  { label: 'Status', key: 'status' },
  { label: 'Currency', key: 'currency', foreignOnly: true },
  { label: 'RO Amount', key: 'roAmount' },
  { label: 'X Factor', key: 'xFactor', foreignOnly: true },
  { label: 'INR RO Amt', key: 'inrRoAmount', foreignOnly: true },
  { label: 'Billing Amt', key: 'billingAmt' },
  { label: 'INR Billing', key: 'inrBillingAmt', foreignOnly: true },
  { label: 'Inv Date', key: 'invDate' },
  { label: 'Inv #', key: 'invNumber' },
  { label: 'Billing Status', key: 'billingStatus' },
  { label: 'Platform', key: 'platform' },
  { label: 'Sales', key: 'salesContact' },
];

const MERGEABLE_COLS = ['campaignName', 'roNumber', 'roAmount', 'inrRoAmount', 'xFactor', 'currency'];

const computeRowSpans = (rows: InvoiceRow[]) => {
  const spans: Record<string, number[]> = {};
  MERGEABLE_COLS.forEach(key => {
    spans[key] = new Array(rows.length).fill(1);
  });

  for (let i = 1; i < rows.length; i++) {
    const prevRo = String(rows[i - 1].roNumber || '').trim();
    const currRo = String(rows[i].roNumber || '').trim();

    if (currRo !== '' && currRo === prevRo) {
      MERGEABLE_COLS.forEach(key => {
        const prevVal = String((rows[i - 1] as any)[key] || '').trim();
        const currVal = String((rows[i] as any)[key] || '').trim();
        if (currVal === prevVal) {
          spans[key][i] = 0;
          let k = i - 1;
          while (k >= 0 && spans[key][k] === 0) k--;
          if (k >= 0) spans[key][k] += 1;
        }
      });
    }
  }
  return spans;
};

export default function InvoiceTable({ rows, activeTab, onRowUpdated }: InvoiceTableProps) {
  const [sortKey, setSortKey] = useState<string>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editRecord, setEditRecord] = useState<InvoiceRow | null>(null);
  const PAGE_SIZE = 20;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      r.clientName.toLowerCase().includes(q) ||
      r.campaignName.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.roNumber.toLowerCase().includes(q) ||
      r.salesContact.toLowerCase().includes(q) ||
      r.month.toLowerCase().includes(q)
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
  const rowSpans = computeRowSpans(pageRows);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const handleDelete = async (rowId: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      if (window.confirm("DOUBLE CONFIRMATION: The record will be permanently deleted from the cloud database. Click OK to proceed.")) {
        try {
          const res = await fetch(`/api/invoices?rowId=${rowId}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) onRowUpdated();
          else alert('Delete failed: ' + json.error);
        } catch {
          alert('Network error while deleting.');
        }
      }
    }
  };

  function renderCell(row: InvoiceRow, key: string): React.ReactNode {
    if (key === 'roAmount' || key === 'billingAmt') {
      const v = (row as unknown as Record<string, unknown>)[key] as number;
      if (v <= 0) return '—';
      if (row.currency && row.currency !== 'INR' && row.currency.trim()) {
        return `${row.currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      }
      return formatINR(v);
    }
    if (key === 'inrRoAmount' || key === 'inrBillingAmt') {
      let v = (row as any)[key];
      return v > 0 ? formatINR(v) : '—';
    }
    if (key === 'currency') {
      return row.currency || '—';
    }
    if (key === 'xFactor') {
      return row.xFactor ? Number(row.xFactor).toFixed(2) : '—';
    }
    if (key === 'status') {
      const s = row.status || 'Unknown';
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>
          {s}
        </span>
      );
    }
    if (key === 'invDate') {
      const d = row.invoiceDateParsed ? new Date(row.invoiceDateParsed) : null;
      const display = d ? formatDate(d) : row.invDate || '—';
      return (
        <span className={!row.invDate ? 'text-red-400 italic text-xs' : ''}>
          {display || '—'}
        </span>
      );
    }
    if (key === 'invNumber') {
      return (
        <span className={!row.invNumber ? 'text-red-400 italic text-xs' : ''}>
          {row.invNumber || '—'}
        </span>
      );
    }
    if (key === 'billingStatus') {
      return (
        <span className={!row.billingStatus ? 'text-red-400 italic text-xs' : ''}>
          {row.billingStatus || 'Unpaid'}
        </span>
      );
    }
    return String((row as unknown as Record<string, unknown>)[key] ?? '') || '—';
  }

  const visibleCols = BASE_COLS.filter(col => {
    if (!col.foreignOnly) return true;
    return activeTab === 'foreign';
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <input
          type="text"
          placeholder="Search client, campaign, status, month..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800"
        />
        <span className="text-sm text-gray-400 dark:text-slate-400 whitespace-nowrap">{filtered.length} records</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <table className="min-w-full text-sm bg-white dark:bg-slate-900">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              {visibleCols.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {col.label}{sortKey === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  Actions
                </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + 1} className="px-4 py-10 text-center text-gray-400 dark:text-slate-500">
                  No records found
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-50 dark:border-slate-800/50 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/40 dark:bg-slate-800/40'} hover:bg-blue-50/20 dark:hover:bg-slate-800/60`}
                >
                  {visibleCols.map(col => {
                    if (MERGEABLE_COLS.includes(col.key)) {
                      const span = rowSpans[col.key][i];
                      if (span === 0) return null;
                      return (
                        <td key={col.key} rowSpan={span} className={`px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-nowrap ${span > 1 ? 'align-middle bg-white dark:bg-slate-900 border-x border-gray-50/50 dark:border-slate-800/30' : ''}`}>
                          {renderCell(row, col.key)}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-nowrap">
                        {renderCell(row, col.key)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditRecord(row)}
                        className="px-3 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="px-3 py-1 text-xs font-semibold bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500 dark:text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {editRecord && (
        <NewEntryModal
          editData={editRecord}
          defaultTab={editRecord.sheetTab}
          onClose={() => setEditRecord(null)}
          onSaved={() => {
            setEditRecord(null);
            onRowUpdated();
          }}
        />
      )}
    </div>
  );
}
