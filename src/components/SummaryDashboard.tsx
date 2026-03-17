'use client';
import React from 'react';
import { formatINR } from '@/utils/dateHelpers';
import type { InvoiceRow, SheetTab } from '@/types/invoice';
import { TAB_LABELS } from '@/types/invoice';

interface SummaryDashboardProps {
  allRows: InvoiceRow[];
}

const SHEET_TABS: SheetTab[] = ['india', 'foreign', 'google_networks', 'pg_sales', 'pg_deals'];

const STATUS_COLORS: Record<string, string> = {
  'Completed': 'bg-green-100 text-green-700',
  'Running': 'bg-blue-100 text-blue-700',
  'Invoice Raised': 'bg-purple-100 text-purple-700',
  'PO Received': 'bg-yellow-100 text-yellow-700',
};

export default function SummaryDashboard({ allRows }: SummaryDashboardProps) {
  const totalBilling = allRows.reduce((s, r) => s + r.billingAmt, 0);
  const totalRO = allRows.reduce((s, r) => s + r.roAmount, 0);
  const totalCount = allRows.length;

  const bySheet = SHEET_TABS.reduce<Record<SheetTab, InvoiceRow[]>>((acc, t) => {
    acc[t] = allRows.filter(r => r.sheetTab === t);
    return acc;
  }, {} as Record<SheetTab, InvoiceRow[]>);

  const statusCounts = allRows.reduce<Record<string, number>>((acc, r) => {
    if (!r.status) return acc;
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Top overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border-l-4 border-blue-500 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Invoices</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border-l-4 border-green-500 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Billing</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(totalBilling)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border-l-4 border-purple-500 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total RO Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(totalRO)}</p>
        </div>
      </div>

      {/* Per-tab breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Breakdown by Category</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {SHEET_TABS.map(tab => {
            const rows = bySheet[tab];
            const billing = rows.reduce((s, r) => s + r.billingAmt, 0);
            const ro = rows.reduce((s, r) => s + r.roAmount, 0);
            const completed = rows.filter(r => r.status === 'Completed').length;
            const running = rows.filter(r => r.status === 'Running').length;
            return (
              <div key={tab} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 hover:bg-blue-50/30 transition-colors">
                <div className="w-44 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-700">{TAB_LABELS[tab]}</span>
                  <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{rows.length}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">Billing: </span>
                    <span className="font-semibold text-gray-800">{billing > 0 ? formatINR(billing) : '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">RO: </span>
                    <span className="font-semibold text-gray-800">{ro > 0 ? formatINR(ro) : '—'}</span>
                  </div>
                  {completed > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      ✓ {completed} Completed
                    </span>
                  )}
                  {running > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      ▶ {running} Running
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status breakdown */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Status Overview</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(statusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-xs font-semibold">{status}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
