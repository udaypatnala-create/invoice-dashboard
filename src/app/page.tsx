'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardMetrics from '@/components/DashboardMetrics';
import InvoiceTable from '@/components/InvoiceTable';
import NewEntryModal from '@/components/NewEntryModal';
import TimeFilter, { TimeFilterValue } from '@/components/TimeFilter';
import SheetTabs from '@/components/SheetTabs';
import SummaryDashboard from '@/components/SummaryDashboard';
import type { InvoiceRow, SheetTab } from '@/types/invoice';
import { TAB_LABELS } from '@/types/invoice';

const SHEET_TABS: SheetTab[] = ['india', 'foreign', 'google_networks', 'pg_sales'];

function applyTimeFilter(
  rows: InvoiceRow[],
  filter: TimeFilterValue,
  specificMonth: string,
  customFrom: string,
  customTo: string
): InvoiceRow[] {
  if (filter === 'all') return rows;
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  return rows.filter(row => {
    let d: Date | null = null;
    if (row.invoiceDateParsed) d = new Date(row.invoiceDateParsed);
    else if (row.startDateParsed) d = new Date(row.startDateParsed);
    else if (row.month) d = new Date(row.month);

    if (!d || isNaN(d.getTime())) return false;

    if (filter === 'this_month') return d.getMonth() === curMonth && d.getFullYear() === curYear;
    if (filter === 'last_month') {
      const last = new Date(curYear, curMonth - 1, 1);
      return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
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

  const [activeTab, setActiveTab] = useState<SheetTab | 'summary'>('summary');
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
      setError('Failed to load invoice data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Time-filtered rows across all sheets
  const timeFiltered = useMemo(
    () => applyTimeFilter(rows, filter, specificMonth, customFrom, customTo),
    [rows, filter, specificMonth, customFrom, customTo]
  );

  // Tab-filtered rows (for table view)
  const tabRows = useMemo(() => {
    if (activeTab === 'summary') return timeFiltered;
    return timeFiltered.filter(r => r.sheetTab === activeTab);
  }, [timeFiltered, activeTab]);

  // Count per tab (time-filtered)
  const tabCounts = useMemo(() => {
    const counts: Partial<Record<SheetTab, number>> = {};
    for (const tab of SHEET_TABS) {
      counts[tab] = timeFiltered.filter(r => r.sheetTab === tab).length;
    }
    return counts;
  }, [timeFiltered]);

  const activeTabLabel = activeTab === 'summary' ? 'All' : TAB_LABELS[activeTab];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Navbar */}
      <nav className="bg-blue-700 dark:bg-slate-900 shadow-md sticky top-0 z-40 dark:border-b dark:border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
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
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-blue-600 text-blue-700 dark:text-white rounded-lg text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-700 transition-colors shadow-sm dark:border dark:border-blue-500"
            >
              <span className="text-base">+</span> New Entry
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Title + Time Filter */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Overview</h1>
              <p className="text-sm text-gray-400 dark:text-slate-400 mt-0.5">2026 Data — {activeTabLabel}</p>
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>
          <TimeFilter
            filter={filter}
            onFilterChange={setFilter}
            specificMonth={specificMonth}
            onSpecificMonthChange={setSpecificMonth}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>

        {/* Metrics (hidden on summary tab, shown per-tab) */}
        {!loading && !error && activeTab !== 'summary' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-800">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Summary — {activeTabLabel}</h2>
            <DashboardMetrics rows={tabRows} />
          </div>
        )}

        {/* Sheet Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          {/* Tab bar */}
          <div className="px-4 pt-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/50">
            <SheetTabs
              active={activeTab}
              onTabChange={tab => setActiveTab(tab)}
              counts={tabCounts}
            />
          </div>

          <div className="p-5">
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
                <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && activeTab === 'summary' && (
              <SummaryDashboard allRows={timeFiltered} />
            )}

            {!loading && !error && activeTab !== 'summary' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    {TAB_LABELS[activeTab]} Records
                  </h2>
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    + New Entry
                  </button>
                </div>
                <InvoiceTable rows={tabRows} activeTab={activeTab} onRowUpdated={fetchData} />
              </>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <NewEntryModal
          onClose={() => setShowModal(false)}
          onSaved={fetchData}
          defaultTab={activeTab === 'summary' ? 'india' : activeTab}
        />
      )}
    </div>
  );
}

