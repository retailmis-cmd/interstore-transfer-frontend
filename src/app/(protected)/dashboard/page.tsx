'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, BarChart2, PackageOpen, Calendar, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getTransfers } from '@/lib/api';
import { Transfer } from '@/types';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getTransfers(token, 1, 5)
      .then((data) => {
        setTransfers(data.transfers);
        setTotal(data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const todayTransfers = transfers.filter(
    (t) => new Date(t.transfer_date).toDateString() === new Date().toDateString()
  );

  const storeShortName = (store: string) =>
    store.includes('SQUARE') ? 'BC Square' : 'BC Plus';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back, <span className="text-brand-600">{user?.username}</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")} · Inter-Store Transfer App
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Transfers</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{loading ? '—' : total}</p>
            </div>
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-brand-600" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today's Transfers</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {loading ? '—' : todayTransfers.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Items Transferred Today</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {loading ? '—' : todayTransfers.reduce((sum, t) => sum + (Number(t.total_qty) || 0), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <PackageOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/transfer"
          className="card p-6 flex items-center gap-4 hover:shadow-card-md hover:border-brand-200 transition-all group"
        >
          <div className="w-14 h-14 bg-brand-600 rounded-xl flex items-center justify-center shadow group-hover:bg-brand-700 transition-colors">
            <ArrowRightLeft className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">New Transfer</p>
            <p className="text-sm text-slate-500 mt-0.5">Create an inter-store stock transfer</p>
          </div>
        </Link>

        <Link
          href="/reports"
          className="card p-6 flex items-center gap-4 hover:shadow-card-md hover:border-brand-200 transition-all group"
        >
          <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center shadow group-hover:bg-indigo-700 transition-colors">
            <BarChart2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">View Reports</p>
            <p className="text-sm text-slate-500 mt-0.5">Download transfer reports by date range</p>
          </div>
        </Link>
      </div>

      {/* Recent transfers */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Recent Transfers</h2>
          </div>
          <Link href="/reports" className="text-brand-600 text-sm font-medium hover:text-brand-700">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center">
            <PackageOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No transfers yet</p>
            <Link href="/transfer" className="btn-primary mt-4 mx-auto">
              Create First Transfer
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Txn #</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">From</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">To</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-brand-700 font-medium">{t.transaction_number}</td>
                    <td className="px-6 py-4 text-slate-600">{storeShortName(t.from_store)}</td>
                    <td className="px-6 py-4 text-slate-600">{storeShortName(t.to_store)}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(t.transfer_date), 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{t.item_count ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
                        {t.total_qty ?? '—'} pcs
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
