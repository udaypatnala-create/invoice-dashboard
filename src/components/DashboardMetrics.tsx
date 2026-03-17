'use client';
import React from 'react';
import { formatINR } from '@/utils/dateHelpers';
import type { InvoiceRow } from '@/types/invoice';

interface MetricsProps {
  rows: InvoiceRow[];
}

export default function DashboardMetrics({ rows }: MetricsProps) {
  const totalBilling = rows.reduce((s, r) => s + r.billingAmt, 0);
  const totalRO = rows.reduce((s, r) => s + r.roAmount, 0);
  const totalInvoices = rows.length;

  const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const s = r.status || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const statusColors: Record<string, string> = {
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'Running': 'bg-blue-100 text-blue-700 border-blue-200',
    'Invoice Raised': 'bg-purple-100 text-purple-700 border-purple-200',
    'PO Received': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Unknown': 'bg-gray-100 text-gray-500 border-gray-200',
  };

  const cards = [
    {
      label: 'Total Invoices',
      value: totalInvoices.toLocaleString('en-IN'),
      icon: '📄',
      className: 'border-l-4 border-blue-500',
    },
    {
      label: 'Total Billing Amount',
      value: formatINR(totalBilling),
      icon: '💰',
      className: 'border-l-4 border-green-500',
    },
    {
      label: 'Total RO Amount',
      value: formatINR(totalRO),
      icon: '📊',
      className: 'border-l-4 border-purple-500',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {cards.map(card => (
          <div
            key={card.label}
            className={`bg-white rounded-xl px-5 py-4 shadow-sm ${card.className}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{card.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([status, count]) => (
          <span
            key={status}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status] ?? statusColors['Unknown']}`}
          >
            {status}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}
