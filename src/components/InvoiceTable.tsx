'use client';
import React, { useState, useCallback } from 'react';
import type { InvoiceRow, SheetTab } from '@/types/invoice';
import { formatINR, formatDate } from '@/utils/dateHelpers';

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

interface EditState {
  rowId: string;
  status: string;
  invDate: string;
  invNumber: string;
  billingStatus: string;
  currency: string;
  xFactor: number;
  inrBillingAmt: number;
  billingAmt: number; // needed for recalc
}

const STATUS_OPTIONS = [
  'Running',
  'Completed',
  'Stopped',
  'Invoice Raised',
  'PO Received',
  'Pending',
];

export default function InvoiceTable({ rows, activeTab, onRowUpdated }: InvoiceTableProps) {
  const [sortKey, setSortKey] = useState<string>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
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

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function startEdit(row: InvoiceRow) {
    setEditState({
      rowId: row.id,
      status: row.status,
      invDate: row.invDate || '',
      invNumber: row.invNumber || '',
      billingStatus: row.billingStatus || 'Unpaid',
      currency: row.currency || '',
      xFactor: row.xFactor || 1,
      inrBillingAmt: row.inrBillingAmt || 0,
      billingAmt: row.billingAmt || 0,
    });
  }

  const saveEdit = useCallback(async (row: InvoiceRow) => {
    if (!editState) return;
    setSaving(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: row.id,
          year: row.year,
          sheetTab: row.sheetTab,
          updates: {
            status: editState.status,
            invDate: editState.invDate,
            invNumber: editState.invNumber,
            billingStatus: editState.billingStatus,
            currency: editState.currency,
            xFactor: String(editState.xFactor),
            inrBillingAmt: editState.inrBillingAmt,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditState(null);
        onRowUpdated();
      } else {
        alert('Save failed: ' + json.error);
      }
    } catch {
      alert('Network error while saving.');
    } finally {
      setSaving(false);
    }
  }, [editState, onRowUpdated]);

  const updateXFactor = (val: number) => {
    setEditState(s => s ? { ...s, xFactor: val, inrBillingAmt: s.billingAmt * val } : s);
  };

  function renderCell(row: InvoiceRow, key: string): React.ReactNode {
    const isEditing = editState?.rowId === row.id;
    const currentStatus = isEditing ? editState!.status : row.status;
    const canEditInvoiceDetails = currentStatus === 'Completed' || currentStatus === 'Stopped';

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
      if (isEditing) {
         if (key === 'inrRoAmount') v = row.roAmount * editState!.xFactor;
         if (key === 'inrBillingAmt') v = editState!.billingAmt * editState!.xFactor;
      }
      return v > 0 ? formatINR(v) : '—';
    }
    if (key === 'currency') {
      if (isEditing) {
        return (
          <select
            value={editState!.currency}
            onChange={e => setEditState(s => s ? { ...s, currency: e.target.value } : s)}
            className="border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">--</option>
            {['USD', 'GBP', 'CAD', 'EUR', 'AUD', 'AED', 'SGD'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        );
      }
      return row.currency || '—';
    }
    if (key === 'xFactor') {
      if (isEditing) {
         return (
           <input
             type="number"
             step="0.01"
             value={editState!.xFactor}
             onChange={e => updateXFactor(parseFloat(e.target.value) || 0)}
             className="border border-blue-300 dark:border-blue-700 rounded px-2 py-1 w-20 text-xs bg-white dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
           />
         );
      }
      return row.xFactor ? Number(row.xFactor).toFixed(2) : '—';
    }
    if (key === 'status') {
      if (isEditing) {
        return (
          <select
            value={editState!.status}
            onChange={e => setEditState(s => s ? { ...s, status: e.target.value } : s)}
            className="border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-slate-800 dark:text-slate-200"
          >
            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      }
      const s = row.status || 'Unknown';
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>
          {s}
        </span>
      );
    }
    if (key === 'invDate') {
      if (isEditing) {
        return (
          <input
            type="date"
            value={editState!.invDate}
            disabled={!canEditInvoiceDetails}
            onChange={e => setEditState(s => s ? { ...s, invDate: e.target.value } : s)}
            className={`border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-slate-800 dark:text-slate-200 ${!canEditInvoiceDetails ? 'bg-gray-100 dark:bg-slate-900 cursor-not-allowed opacity-50' : ''}`}
          />
        );
      }
      const d = row.invoiceDateParsed ? new Date(row.invoiceDateParsed) : null;
      const display = d ? formatDate(d) : row.invDate || '—';
      return (
        <span className={canEditInvoiceDetails && !row.invDate ? 'text-red-400 italic text-xs' : ''}>
          {display || (canEditInvoiceDetails ? 'Set date' : '—')}
        </span>
      );
    }
    if (key === 'invNumber') {
      if (isEditing) {
        return (
          <input
            type="text"
            value={editState!.invNumber}
            disabled={!canEditInvoiceDetails}
            onChange={e => setEditState(s => s ? { ...s, invNumber: e.target.value } : s)}
            placeholder="INV-XXXX"
            className={`border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-slate-800 dark:text-slate-200 ${!canEditInvoiceDetails ? 'bg-gray-100 dark:bg-slate-900 cursor-not-allowed opacity-50' : ''}`}
          />
        );
      }
      return (
        <span className={canEditInvoiceDetails && !row.invNumber ? 'text-red-400 italic text-xs' : ''}>
          {row.invNumber || (canEditInvoiceDetails ? 'Set number' : '—')}
        </span>
      );
    }
    if (key === 'billingStatus') {
      if (isEditing) {
        return (
          <select
            value={editState!.billingStatus}
            onChange={e => setEditState(s => s ? { ...s, billingStatus: e.target.value } : s)}
            className="border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        );
      }
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
              pageRows.map((row, i) => {
                const isEditing = editState?.rowId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 dark:border-slate-800/50 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/40 dark:bg-slate-800/40'} ${isEditing ? 'bg-blue-50/60 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'hover:bg-blue-50/20 dark:hover:bg-slate-800/60'}`}
                  >
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-nowrap">
                        {renderCell(row, col.key)}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(row)}
                          className="px-3 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {isEditing && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveEdit(row)}
                            disabled={saving}
                            className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {saving ? '...' : '✓ Save'}
                          </button>
                          <button
                            onClick={() => setEditState(null)}
                            className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
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
    </div>
  );
}
