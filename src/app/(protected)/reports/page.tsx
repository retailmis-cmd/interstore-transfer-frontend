'use client';

import { useState } from 'react';
import {
  BarChart2, Download, Filter, Calendar, AlertCircle, FileText,
  ChevronDown, ChevronUp, PackageOpen, Trash2
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getReport, downloadCSV, downloadExcel, deleteTransfer } from '@/lib/api';
import { ReportRow } from '@/types';
import { format, subDays } from 'date-fns';

interface GroupedTransfer {
  id: number;
  transaction_number: string;
  from_store: string;
  to_store: string;
  transfer_date: string;
  status: string;
  created_by: string;
  items: { barcode: string; quantity: number }[];
  total_qty: number;
}

function groupRows(rows: ReportRow[]): GroupedTransfer[] {
  const map = new Map<string, GroupedTransfer>();
  for (const row of rows) {
    if (!map.has(row.transaction_number)) {
      map.set(row.transaction_number, {
        id: row.id,
        transaction_number: row.transaction_number,
        from_store: row.from_store,
        to_store: row.to_store,
        transfer_date: row.transfer_date,
        status: row.status,
        created_by: row.created_by,
        items: [],
        total_qty: 0,
      });
    }
    const entry = map.get(row.transaction_number)!;
    if (row.barcode) {
      entry.items.push({ barcode: row.barcode, quantity: row.quantity });
      entry.total_qty += row.quantity;
    }
  }
  return Array.from(map.values());
}

const storeShort = (s: string) => (s.includes('SQUARE') ? 'BC Square' : 'BC Plus');

export default function ReportsPage() {
  const { token, user } = useAuth();

  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [grouped, setGrouped] = useState<GroupedTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchReport = async () => {
    if (!token) return;
    if (fromDate > toDate) {
      setError('From date must be before or equal to To date.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await getReport(token, fromDate, toDate);
      setRows(data);
      setGrouped(groupRows(data));
      setFetched(true);
      setExpandedRows(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (txn: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(txn) ? next.delete(txn) : next.add(txn);
      return next;
    });
  };

  const totalQty = rows.reduce((sum, r) => sum + (r.quantity || 0), 0);

  const handleDelete = async (t: GroupedTransfer) => {
    if (!confirm(`Delete transfer ${t.transaction_number}? This cannot be undone.`)) return;
    setDeletingId(t.id);
    try {
      await deleteTransfer(token!, t.id);
      const newRows = rows.filter((r) => r.transaction_number !== t.transaction_number);
      setRows(newRows);
      setGrouped(groupRows(newRows));
      setExpandedRows((prev) => { const n = new Set(prev); n.delete(t.transaction_number); return n; });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transfer.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transfer Reports</h1>
          <p className="text-slate-500 text-sm">View and export stock transfer history</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" /> Date Range Filter
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-field pl-10 w-44"
              />
            </div>
          </div>
          <div>
            <label className="label">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input-field pl-10 w-44"
              />
            </div>
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="btn-primary h-[42px] px-6"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Filter className="w-4 h-4" />
            )}
            {loading ? 'Loading…' : 'Apply Filter'}
          </button>
          {fetched && rows.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCSV(rows, fromDate, toDate)}
                className="btn-secondary h-[42px] px-5"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => downloadExcel(rows, fromDate, toDate)}
                className="h-[42px] px-5 flex items-center gap-2 rounded-lg border border-green-600 bg-green-600 text-white text-sm font-medium hover:bg-green-700 hover:border-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Summary stats */}
      {fetched && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Transactions</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">{grouped.length}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total SKUs</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">{rows.length}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Qty</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">{totalQty}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {fetched && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">
              Results for {format(new Date(fromDate + 'T00:00:00'), 'dd MMM yyyy')} –{' '}
              {format(new Date(toDate + 'T00:00:00'), 'dd MMM yyyy')}
            </h2>
          </div>

          {grouped.length === 0 ? (
            <div className="p-12 text-center">
              <PackageOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No transfers found in this date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8" />
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Txn #</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">From</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">To</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Time</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">SKUs</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Total Qty</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">By</th>
                    {user?.role === 'admin' && (
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((t) => (
                    <>
                      <tr
                        key={t.transaction_number}
                        className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => toggleExpand(t.transaction_number)}
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {expandedRows.has(t.transaction_number) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-brand-700 font-medium whitespace-nowrap">
                          {t.transaction_number}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{storeShort(t.from_store)}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{storeShort(t.to_store)}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {format(new Date(t.transfer_date), 'dd MMM yyyy, hh:mm a')}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{t.items.length}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
                            {t.total_qty} pcs
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{t.created_by || '—'}</td>
                        {user?.role === 'admin' && (
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDelete(t)}
                              disabled={deletingId === t.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto disabled:opacity-40"
                              title="Delete transfer"
                            >
                              {deletingId === t.id ? (
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                      {expandedRows.has(t.transaction_number) && (
                        <tr key={`${t.transaction_number}-items`} className="bg-brand-50/50">
                          <td colSpan={user?.role === 'admin' ? 9 : 8} className="px-8 py-3">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Item Details
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {t.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100 shadow-sm"
                                >
                                  <span className="font-mono text-slate-700 text-xs truncate">{item.barcode}</span>
                                  <span className="ml-2 text-xs font-bold text-brand-600 shrink-0">×{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!fetched && (
        <div className="card p-12 text-center">
          <BarChart2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Select a date range and click Apply Filter to view reports.</p>
        </div>
      )}
    </div>
  );
}
