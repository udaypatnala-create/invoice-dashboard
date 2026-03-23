'use client';
import React, { useState } from 'react';
import type { SheetTab } from '@/types/invoice';
import { TAB_LABELS } from '@/types/invoice';

interface NewEntryModalProps {
  onClose: () => void;
  onSaved: () => void;
  defaultTab?: SheetTab;
}

const STATUS_OPTIONS = [
  'Running',
  'Completed',
  'Stopped',
  'Invoice Raised',
  'PO Received',
  'Pending',
];

const PLATFORM_OPTIONS = ['Mobile', 'Desktop', 'CTV', 'Other'];

export default function NewEntryModal({ onClose, onSaved, defaultTab = 'india' }: NewEntryModalProps) {
  const [form, setForm] = useState({
    sheetTab: defaultTab,
    month: '',
    year: '2026',
    clientName: '',
    campaignName: '',
    roNumber: '',
    series: '',
    opsName: '',
    status: 'Running',
    orderId: '',
    roAmount: '',
    billingAmt: '',
    startDate: '',
    endDate: '',
    invDate: '',
    invNumber: '',
    comment: '',
    platform: 'Mobile',
    salesContact: '',
    currency: '',
    xFactor: '',
    inrRoAmount: '',
    inrBillingAmt: '',
    billingStatus: 'Unpaid',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setAmount = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm(f => {
      const newF = { ...f, [k]: val };
      const baseRo = parseFloat(newF.roAmount.replace(/,/g, '')) || 0;
      const baseBil = parseFloat(newF.billingAmt.replace(/,/g, '')) || 0;
      const cx = parseFloat(newF.xFactor) || 1;
      
      if (newF.currency && newF.currency !== 'INR') {
        newF.inrRoAmount = String((baseRo * cx).toFixed(2));
        newF.inrBillingAmt = String((baseBil * cx).toFixed(2));
      } else {
        newF.inrRoAmount = String(baseRo);
        newF.inrBillingAmt = String(baseBil);
      }
      return newF;
    });
  };

  const showForeignFields = ['foreign', 'pg_sales', 'google_networks'].includes(form.sheetTab);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.month) {
      setError('Client Name and Month are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        onSaved();
        onClose();
      } else {
        setError(json.error || 'Failed to save entry.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Invoice Entry</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Add a new row to the Excel file</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Row 0 – Sheet */}
          <div>
            <label className={labelCls}>Sheet / Category</label>
            <select value={form.sheetTab} onChange={set('sheetTab')} className={inputCls}>
              {(Object.entries(TAB_LABELS) as [string, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Row 1 – Month */}
          <div>
            <label className={labelCls}>Month & Year *</label>
            <input type="month" value={form.month} onChange={set('month')} className={inputCls} required />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Client Name *</label>
              <input type="text" value={form.clientName} onChange={set('clientName')} className={inputCls} required placeholder="e.g. BCCL" />
            </div>
            <div>
              <label className={labelCls}>Campaign Name</label>
              <input type="text" value={form.campaignName} onChange={set('campaignName')} className={inputCls} placeholder="e.g. T20 WC" />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>RO Number</label>
              <input type="text" value={form.roNumber} onChange={set('roNumber')} className={inputCls} placeholder="e.g. ICO/3943/24-25" />
            </div>
            <div>
              <label className={labelCls}>Series</label>
              <input type="text" value={form.series} onChange={set('series')} className={inputCls} placeholder="e.g. T20 WC" />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ops Name</label>
              <input type="text" value={form.opsName} onChange={set('opsName')} className={inputCls} placeholder="e.g. Mani" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>RO Amount</label>
              <input type="text" value={form.roAmount} onChange={setAmount('roAmount')} className={inputCls} placeholder="e.g. 375000" />
            </div>
            <div>
              <label className={labelCls}>Billing Amount</label>
              <input type="text" value={form.billingAmt} onChange={setAmount('billingAmt')} className={inputCls} placeholder="e.g. 375000" />
            </div>
          </div>

          {/* Row Foreign */}
          {showForeignFields && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={form.currency} onChange={setAmount('currency')} className={inputCls}>
                    <option value="">--</option>
                    {['USD', 'GBP', 'CAD', 'EUR', 'AUD', 'AED', 'SGD'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>X Factor (Manual Exchange Rate)</label>
                  <input type="number" step="0.01" value={form.xFactor} onChange={setAmount('xFactor')} className={inputCls} placeholder="e.g. 83.50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>INR RO Amount</label>
                  <input type="text" value={form.inrRoAmount} readOnly className={`${inputCls} bg-gray-50 dark:bg-slate-800/80 text-gray-400 dark:text-slate-500`} placeholder="Auto calculated" />
                </div>
                <div>
                  <label className={labelCls}>INR Billing</label>
                  <input type="text" value={form.inrBillingAmt} readOnly className={`${inputCls} bg-gray-50 dark:bg-slate-800/80 text-gray-400 dark:text-slate-500`} placeholder="Auto calculated" />
                </div>
              </div>
            </>
          )}

          {/* Row 6 - Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={form.startDate} onChange={set('startDate')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Invoice Date</label>
              <input type="date" value={form.invDate} onChange={set('invDate')} className={inputCls} />
            </div>
          </div>

          {/* Row 7 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Invoice Number</label>
              <input type="text" value={form.invNumber} onChange={set('invNumber')} className={inputCls} placeholder="e.g. 260089-CGEL-EXP" />
            </div>
            <div>
              <label className={labelCls}>Order ID</label>
              <input type="text" value={form.orderId} onChange={set('orderId')} className={inputCls} placeholder="e.g. 3921327540" />
            </div>
          </div>

          {/* Row 8 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Platform</label>
              <select value={form.platform} onChange={set('platform')} className={inputCls}>
                {PLATFORM_OPTIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sales Contact</label>
              <input type="text" value={form.salesContact} onChange={set('salesContact')} className={inputCls} placeholder="e.g. Neerav" />
            </div>
          </div>

          {/* Billing Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Billing Status</label>
              <select value={form.billingStatus} onChange={set('billingStatus')} className={inputCls}>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className={labelCls}>Comment</label>
            <textarea value={form.comment} onChange={set('comment')} rows={2} className={inputCls} placeholder="Any additional notes..." />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? 'Saving...' : '+ Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
