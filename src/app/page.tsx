'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardMetrics from '@/components/DashboardMetrics';
import InvoiceTable from '@/components/InvoiceTable';
import NewEntryModal from '@/components/NewEntryModal';
import TimeFilter, { TimeFilterValue } from '@/components/TimeFilter';
import type { InvoiceRow } from '@/types/invoice';

function applyTimeFilter(rows: InvoiceRow[], filter: TimeFilterValue, specificMonth: string, customFrom: string, customTo: string): InvoiceRow[] {
  if (filter === 'all') return rows;

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  return rows.filter(row => {
    // Use invoice date if available, otherwise start date, otherwise parse month field
    let d: Date | null = null;
    if (row.invoiceDateParsed) {
      d = new Date(row.invoiceDateParsed);
    } else if (row.startDateParsed) {
      d = new Date(row.startDateParsed);
    } else if (row.month) {
      // e.g. "January 2026" or "March 2026"
      d = new Date(row.month);
    }

    if (!d || isNaN(d.getTime())) return false;

    if (filter === 'this_month') {
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    }
    if (filter === 'last_month') {
      const lastDate = new Date(curYear, curMonth - 1, 1);
      return d.getMonth() === lastDate.getMonth() && d.getFullYear() === lastDate.getFullYear();
    }
    if (filter === 'specific_month' && specificMonth) {
      const [yrStr, moStr] = specificMonth.split('-');
      return d.getFullYear() === parseInt(yrStr) && d.getMonth() === parseInt(moStr) - 1;
    }
    if (filter === 'custom' && customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      to.setHours(23, 59, 59);
      return d >= from && d <= to;
    }
    return true;
  });
}

export default function Dashboard() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [filter, setFilter] = useState<TimeFilterValue>('all');
  const [specificMonth, setSpecificMonth] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/invoices');
      const json = await res.json();
      setRows(json.data ?? []);
    } catch {
      setError('Failed to load invoice data. Make sure the Excel files are accessible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(
    () => applyTimeFilter(rows, filter, specificMonth, customFrom, customTo),
    [rows, filter, specificMonth, customFrom, customTo]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-blue-700 shadow-md sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📋</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Invoice Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-200 text-sm hidden sm:inline">
              {rows.length} total records
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
            >
              <span className="text-base">+</span> New Entry
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Title + Time Filter */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Billing Overview</h1>
              <p className="text-sm text-gray-400 mt-0.5">2025 & 2026 Combined Data</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Year files:</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">2025</span>
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">2026</span>
            </div>
          </div>

          <TimeFilter
            filter={filter}
            onFilterChange={(f) => { setFilter(f); }}
            specificMonth={specificMonth}
            onSpecificMonthChange={setSpecificMonth}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>

        {/* Metrics */}
        {!loading && !error && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Summary</h2>
            <DashboardMetrics rows={filtered} />
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Invoice Records</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span>+</span> New Entry
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
              <span className="ml-3 text-gray-400 text-sm">Loading data...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-5 text-sm">
              <p className="font-semibold mb-1">Failed to load data</p>
              <p className="text-red-400">{error}</p>
              <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && <InvoiceTable rows={filtered} />}
        </div>
      </main>

      {showModal && <NewEntryModal onClose={() => setShowModal(false)} onSaved={fetchData} />}
    </div>
  );
}
