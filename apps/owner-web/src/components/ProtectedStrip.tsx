'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { formatBirr } from '@payproof/money';
import { Skeleton } from './Skeleton';

export interface ProtectedStripData {
  suspiciousAttemptsCaught: number;
  totalBirrProtectedMinor: number;
  lastInterceptAt?: string;
  doubleSpendsPrevented: number;
  underpaidPrevented: number;
}

interface ProtectedStripProps {
  data: ProtectedStripData;
  loading?: boolean;
  onViewAlerts?: () => void;
}

export function ProtectedStripSkeleton() {
  return (
    <div className="bg-emerald-950 text-white rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg bg-emerald-800" />
          <div>
            <Skeleton className="w-36 h-4 bg-emerald-800 mb-2" />
            <Skeleton className="w-64 h-6 bg-emerald-800" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <Skeleton className="w-24 h-3 bg-emerald-800 mb-1" />
            <Skeleton className="w-16 h-5 bg-emerald-800" />
          </div>
          <div>
            <Skeleton className="w-24 h-3 bg-emerald-800 mb-1" />
            <Skeleton className="w-20 h-5 bg-emerald-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtectedStrip({ data, loading, onViewAlerts }: ProtectedStripProps) {
  if (loading) {
    return <ProtectedStripSkeleton />;
  }

  const birrProtected = formatBirr(data.totalBirrProtectedMinor);

  return (
    <div className="bg-linear-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-xl p-5 mb-8 border border-emerald-900/50 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Main message */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Fraud Shield Active
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              Protected this week:{' '}
              <span className="text-emerald-300 font-extrabold">{birrProtected}</span> across{' '}
              <span className="text-emerald-300 font-extrabold">
                {data.suspiciousAttemptsCaught}
              </span>{' '}
              suspicious attempts
            </h3>
          </div>
        </div>

        {/* Breakdown counters & action */}
        <div className="flex items-center flex-wrap gap-5 pt-2 lg:pt-0 border-t border-slate-800 lg:border-t-0">
          <div className="flex items-center gap-4 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-medium">
                Double-Spends
              </span>
              <span className="font-bold text-slate-200 text-sm">
                {data.doubleSpendsPrevented} blocked
              </span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-medium">
                Underpaid Attempts
              </span>
              <span className="font-bold text-slate-200 text-sm">
                {data.underpaidPrevented} blocked
              </span>
            </div>
          </div>

          {onViewAlerts && (
            <button
              type="button"
              onClick={onViewAlerts}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shrink-0 shadow-xs"
            >
              Review Alerts
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
