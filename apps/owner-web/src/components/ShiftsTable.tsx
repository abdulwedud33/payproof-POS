'use client';

import React, { useState } from 'react';
import type { ShiftResponse } from '@payproof/shared-types';
import { formatBirr } from '@payproof/money';
import { formatEthiopianDate } from '@payproof/shared-types';
import { Clock, DollarSign, AlertCircle, CheckCircle, FileText, Printer, X } from 'lucide-react';
import { TableSkeleton } from './Skeleton';

export interface ShiftsTableProps {
  shifts: ShiftResponse[];
  loading?: boolean;
  calendarSystem?: 'GC' | 'EC';
  locale?: 'en' | 'am' | 'om';
}

export function ShiftsTable({
  shifts,
  loading,
  calendarSystem = 'EC',
  locale = 'en',
}: ShiftsTableProps) {
  const [selectedShiftForZReport, setSelectedShiftForZReport] = useState<ShiftResponse | null>(
    null
  );

  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  const getDiscrepancyBadge = (diff: number | null) => {
    if (diff === null) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      );
    }
    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" /> Balanced (0.00)
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3 h-3" /> +{formatBirr(diff)} Over
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3" /> -{formatBirr(Math.abs(diff))} Short
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              Cash Drawer & Shift Reconciliations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited Z-Reports tracking cashier opening floats, counted cash, and drawer
              overage/shortage
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-200/60 px-2.5 py-1 rounded-md">
            {shifts.length} Total Shifts
          </span>
        </div>

        {shifts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-800">No shifts recorded yet</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Cashier shifts and end-of-day drawer counts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Cashier / Branch</th>
                  <th className="px-4 py-3">Shift Opened</th>
                  <th className="px-4 py-3">Shift Closed</th>
                  <th className="px-4 py-3 text-right">Opening Float</th>
                  <th className="px-4 py-3 text-right">Expected Drawer</th>
                  <th className="px-4 py-3 text-right">Actual Counted</th>
                  <th className="px-4 py-3 text-center">Variance (Z-Status)</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {s.cashier_name || 'Cashier'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {s.branch_name || 'Bole Branch'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>
                        {calendarSystem === 'EC'
                          ? formatEthiopianDate(s.opened_at, locale, { short: true })
                          : new Date(s.opened_at).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(s.opened_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.closed_at ? (
                        <div>
                          <div>
                            {calendarSystem === 'EC'
                              ? formatEthiopianDate(s.closed_at, locale, { short: true })
                              : new Date(s.closed_at).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(s.closed_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-semibold italic">Open now</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatBirr(s.opening_float_minor)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatBirr(s.expected_cash_minor)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {s.actual_cash_minor !== null ? formatBirr(s.actual_cash_minor) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {getDiscrepancyBadge(s.cash_difference_minor)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'closed' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedShiftForZReport(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Z-Report
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Z-Report Modal */}
      {selectedShiftForZReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                End-of-Day Z-Report
              </h4>
              <button
                type="button"
                onClick={() => setSelectedShiftForZReport(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Paper Simulation */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-800 space-y-2 whitespace-pre-wrap leading-relaxed shadow-inner">
              <div className="text-center font-bold text-sm tracking-tight border-b border-dashed border-slate-300 pb-2">
                PAYPROOF POS · END OF DAY Z-REPORT
                <div className="text-xs font-normal text-slate-500 mt-0.5">
                  {selectedShiftForZReport.branch_name || 'Bole Branch'}
                </div>
              </div>
              <div>Cashier: {selectedShiftForZReport.cashier_name}</div>
              <div>Opened: {new Date(selectedShiftForZReport.opened_at).toLocaleString()}</div>
              <div>
                Closed:{' '}
                {selectedShiftForZReport.closed_at
                  ? new Date(selectedShiftForZReport.closed_at).toLocaleString()
                  : 'Open'}
              </div>
              <div className="border-t border-dashed border-slate-300 pt-1">
                <div>Total Sales Count: {selectedShiftForZReport.total_sales_count}</div>
                <div>Total Voids: {selectedShiftForZReport.total_void_count}</div>
                <div>Opening Float: {formatBirr(selectedShiftForZReport.opening_float_minor)}</div>
                <div>
                  Expected Drawer: {formatBirr(selectedShiftForZReport.expected_cash_minor)}
                </div>
                <div>
                  Actual Counted: {formatBirr(selectedShiftForZReport.actual_cash_minor || 0)}
                </div>
                <div className="font-bold border-t border-slate-300 pt-1 text-slate-900">
                  Variance:{' '}
                  {selectedShiftForZReport.cash_difference_minor !== null
                    ? formatBirr(selectedShiftForZReport.cash_difference_minor)
                    : '0.00 ETB'}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedShiftForZReport(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Z-Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
