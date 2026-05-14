'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scan, Plus, Minus, Trash2, CheckCircle, AlertCircle, ArrowRightLeft,
  RefreshCw, Save, X, Camera
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getNextTransactionNumber, createTransfer } from '@/lib/api';
import { STORES, TransferItem } from '@/types';
import dynamic from 'next/dynamic';

const CameraScanner = dynamic(() => import('@/components/CameraScanner'), { ssr: false });
import { format } from 'date-fns';

export default function TransferPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [fromStore, setFromStore] = useState('');
  const [toStore, setToStore] = useState('');
  const [transferDate, setTransferDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [transactionNumber, setTransactionNumber] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);

  const fetchTxnNumber = useCallback(async () => {
    if (!token) return;
    setLoadingNumber(true);
    try {
      const data = await getNextTransactionNumber(token);
      setTransactionNumber(data.transaction_number);
    } catch {
      setTransactionNumber('TRF-' + format(new Date(), 'yyyyMMdd') + '-0001');
    } finally {
      setLoadingNumber(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTxnNumber();
  }, [fetchTxnNumber]);

  // Auto-focus barcode input
  useEffect(() => {
    barcodeRef.current?.focus();
  }, [items]);

  const processBarcode = (raw: string) => {
    const barcode = raw.trim();
    if (!barcode) return;

    setItems((prev) => {
      const existing = prev.findIndex((item) => item.barcode === barcode);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        setFlashRowId(barcode);
        setTimeout(() => setFlashRowId(null), 400);
        return updated;
      } else {
        setNewRowId(barcode);
        setTimeout(() => setNewRowId(null), 400);
        return [{ barcode, quantity: 1 }, ...prev];
      }
    });

    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const handleCameraScan = useCallback((barcode: string) => {
    processBarcode(barcode);
  }, [processBarcode]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processBarcode(barcodeInput);
    }
  };

  const updateQty = (barcode: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.barcode === barcode
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
    );
  };

  const removeItem = (barcode: string) => {
    setItems((prev) => prev.filter((item) => item.barcode !== barcode));
  };

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fromStore) return setError('Please select a From Store.');
    if (!toStore) return setError('Please select a To Store.');
    if (fromStore === toStore) return setError('From Store and To Store cannot be the same.');
    if (items.length === 0) return setError('Please scan at least one barcode.');

    setSubmitting(true);
    try {
      await createTransfer(token!, {
        transaction_number: transactionNumber,
        from_store: fromStore,
        to_store: toStore,
        transfer_date: new Date(transferDate).toISOString(),
        items,
      });

      setSuccess(`Transfer ${transactionNumber} saved successfully!`);
      setItems([]);
      setFromStore('');
      setToStore('');
      setTransferDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      await fetchTxnNumber();
      barcodeRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    if (items.length > 0 && !confirm('Clear all scanned items?')) return;
    setItems([]);
    setFromStore('');
    setToStore('');
    setTransferDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setError('');
    setSuccess('');
    barcodeRef.current?.focus();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {cameraOpen && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => {
            setCameraOpen(false);
            setTimeout(() => barcodeRef.current?.focus(), 100);
          }}
        />
      )}
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">New Inter Store Transfer</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">Scan garment barcodes to record stock movement between stores</p>
      </div>

      {/* Alert */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 mb-5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 p-3 mb-5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Transaction info */}
        <div className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label">Transaction Number</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={loadingNumber ? 'Generating…' : transactionNumber}
                  readOnly
                  className="input-field font-mono bg-slate-50 text-brand-700 font-semibold cursor-default"
                />
                <button
                  type="button"
                  onClick={fetchTxnNumber}
                  disabled={loadingNumber}
                  className="btn-secondary px-3 py-2.5"
                  title="Regenerate"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingNumber ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div>
              <label className="label">Transfer Date & Time</label>
              <input
                type="datetime-local"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
        </div>

        {/* Store selection */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Store Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label">From Store</label>
              <select
                value={fromStore}
                onChange={(e) => setFromStore(e.target.value)}
                className="select-field"
                required
              >
                <option value="">— Select source store —</option>
                {STORES.map((store) => (
                  <option key={store} value={store} disabled={store === toStore}>
                    {store}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">To Store</label>
              <select
                value={toStore}
                onChange={(e) => setToStore(e.target.value)}
                className="select-field"
                required
              >
                <option value="">— Select destination store —</option>
                {STORES.map((store) => (
                  <option key={store} value={store} disabled={store === fromStore}>
                    {store}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Barcode scanner */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Barcode Scanner</h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
              <input
                ref={barcodeRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode or type and press Enter…"
                className="input-field pl-10"
                autoComplete="off"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => processBarcode(barcodeInput)}
              className="btn-primary px-5"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="btn-secondary px-4 flex items-center gap-2"
              title="Scan with camera"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Scanning the same barcode multiple times will increment the quantity automatically.
          </p>
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                Scanned Items <span className="text-brand-600 ml-1">({items.length} SKUs · {totalQty} pcs)</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Barcode</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center w-40">Quantity</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right w-20">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item, idx) => (
                    <tr
                      key={item.barcode}
                      className={`transition-all ${
                        flashRowId === item.barcode
                          ? 'bg-brand-50 scan-flash'
                          : newRowId === item.barcode
                          ? 'row-enter'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-5 py-3 text-slate-400 text-xs">{items.length - idx}</td>
                      <td className="px-5 py-3 font-mono text-slate-700 font-medium">{item.barcode}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQty(item.barcode, -1)}
                            className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center font-semibold text-slate-800">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.barcode, 1)}
                            className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.barcode)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-50 border-t border-brand-100">
                    <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-brand-700">
                      Total
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-brand-700">{totalQty} pcs</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={handleClear} className="btn-secondary">
            <X className="w-4 h-4" /> Clear All
          </button>
          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="btn-primary px-6 py-2.5"
          >
            {submitting ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting ? 'Saving…' : 'Save Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
}
