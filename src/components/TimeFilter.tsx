'use client';
import React from 'react';

export type TimeFilterValue =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'specific_month'
  | 'custom';

interface TimeFilterProps {
  filter: TimeFilterValue;
  onFilterChange: (f: TimeFilterValue) => void;
  specificMonth: string; // "YYYY-MM"
  onSpecificMonthChange: (v: string) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}

export default function TimeFilter({
  filter,
  onFilterChange,
  specificMonth,
  onSpecificMonthChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: TimeFilterProps) {
  const tabs: { label: string; value: TimeFilterValue }[] = [
    { label: 'All', value: 'all' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Specific Month', value: 'specific_month' },
    { label: 'Custom Range', value: 'custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onFilterChange(tab.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
            filter === tab.value
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-slate-600'
          }`}
        >
          {tab.label}
        </button>
      ))}

      {filter === 'specific_month' && (
        <input
          type="month"
          value={specificMonth}
          onChange={e => onSpecificMonthChange(e.target.value)}
          className="ml-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}

      {filter === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={e => onCustomFromChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-gray-400 dark:text-slate-500 text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={e => onCustomToChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      )}
    </div>
  );
}
