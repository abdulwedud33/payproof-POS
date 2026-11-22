import React from 'react';
import type { SaleResponse } from '@payproof/shared-types';
import { formatEthiopianDate } from '@payproof/shared-types';
import { formatBirr } from '@payproof/money';
import { Receipt, Ban } from 'lucide-react';
import { TableSkeleton } from './Skeleton';

export interface SalesTableProps {
  sales: SaleResponse[];
  loading: boolean;
  onVoidClick: (sale: SaleResponse) => void;
  calendarSystem?: 'GC' | 'EC';
  locale?: 'en' | 'am' | 'om';
}

export function SalesTable({
  sales,
  loading,
  onVoidClick,
  calendarSystem = 'EC',
  locale = 'en',
}: SalesTableProps) {
  if (loading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">Register Sales Journal</h3>
        <span className="text-xs text-slate-500 font-medium">All completed & voided sales</span>
      </div>

      {sales.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-800">No sales recorded yet</h4>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Sales rung up by cashiers will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt ID</th>
                <th className="py-3 px-4">Completed Time</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-900">
                    {sale.id.slice(0, 8)}...
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {sale.completed_at ? (
                      <div>
                        <div className="font-medium text-slate-800 text-xs">
                          {calendarSystem === 'EC'
                            ? formatEthiopianDate(sale.completed_at, locale, { short: true })
                            : new Date(sale.completed_at).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(sale.completed_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {sale.items?.length || 1} items
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50 uppercase">
                      {sale.payment_method || 'cash'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                    {formatBirr(sale.total_minor)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {sale.status === 'paid' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Paid
                      </span>
                    )}
                    {sale.status === 'voided' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        Voided
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {sale.status === 'paid' && (
                      <button
                        type="button"
                        onClick={() => onVoidClick(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
