'use client';
import React from 'react';
import type { SheetTab } from '@/types/invoice';
import { TAB_LABELS } from '@/types/invoice';

const TABS: SheetTab[] = ['india', 'foreign', 'google_networks', 'pg_sales', 'pg_deals'];

interface SheetTabsProps {
  active: SheetTab | 'summary';
  onTabChange: (t: SheetTab | 'summary') => void;
  counts: Partial<Record<SheetTab, number>>;
}

export default function SheetTabs({ active, onTabChange, counts }: SheetTabsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {/* Summary tab */}
        <button
          onClick={() => onTabChange('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            active === 'summary'
              ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
              : 'border-transparent text-gray-500 bg-gray-100 hover:bg-white hover:text-blue-600'
          }`}
        >
          📊 Summary
        </button>

        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              active === tab
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-gray-500 bg-gray-100 hover:bg-white hover:text-blue-600'
            }`}
          >
            {TAB_LABELS[tab]}
            {counts[tab] !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                active === tab ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
