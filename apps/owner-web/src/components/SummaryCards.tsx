import React from 'react';
import { formatBirr } from '@payproof/money';
import { ShoppingBag, DollarSign, AlertTriangle } from 'lucide-react';
import { SummaryCardSkeleton } from './Skeleton';

export interface SummaryData {
  totalSalesCount: number;
  grossSalesMinor: bigint | number;
  voidCount: number;
  voidMinor: bigint | number;
}

export interface SummaryCardsProps {
  data: SummaryData | null;
  loading: boolean;
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading || !data) {
    return <SummaryCardSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Gross Sales Today */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Sales Today</p>
          <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatBirr(data.grossSalesMinor)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Cash sales verified at registers</p>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      {/* Completed Transactions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Receipts Completed</p>
          <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
            {data.totalSalesCount.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Bole Branch · Register 1</p>
        </div>
        <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
          <ShoppingBag className="w-6 h-6" />
        </div>
      </div>

      {/* Voids & Returned Items */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Logged Voids</p>
          <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
            {data.voidCount > 0 ? (
              <span className="text-amber-700">{data.voidCount} voids ({formatBirr(data.voidMinor)})</span>
            ) : (
              <span className="text-slate-600">0 voids (0.00 Birr)</span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Requires Manager PIN audit trail</p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
