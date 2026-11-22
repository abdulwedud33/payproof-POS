import React, { useState } from 'react';
import type { SaleResponse } from '@payproof/shared-types';
import { formatBirr } from '@payproof/money';
import { X, Lock, AlertTriangle } from 'lucide-react';

export interface VoidModalProps {
  sale: SaleResponse | null;
  onClose: () => void;
  onConfirmVoid: (saleId: string, reason: string, pin?: string) => Promise<void>;
}

export function VoidModal({ sale, onClose, onConfirmVoid }: VoidModalProps) {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for voiding this transaction');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirmVoid(sale.id, reason, pin || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to void sale. Please check your PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Void Sale Transaction</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt ID:</span>
              <span className="font-mono text-slate-800">{sale.id.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Total Amount:</span>
              <span className="text-slate-900 tabular-nums">{formatBirr(sale.total_minor)}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Void <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Customer returned items immediately, incorrect quantity"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Manager / Owner PIN{' '}
              <span className="text-slate-400">(Required above void limit)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                maxLength={6}
                placeholder="4 to 6 digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? 'Processing...' : 'Confirm Void'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
