'use client';

import React, { useState } from 'react';
import { Download, Calendar, BarChart3, TrendingUp, DollarSign, Smartphone } from 'lucide-react';
import { formatBirr } from '@payproof/money';
import { TableSkeleton } from './Skeleton';

export interface ReportSummary {
  grossIncomeMinor: number;
  salesCount: number;
  cashIncomeMinor: number;
  mobileMoneyIncomeMinor: number;
  telebirrIncomeMinor: number;
  cbeIncomeMinor: number;
  voidMinor: number;
  voidCount: number;
}

export interface DimensionBreakdownItem {
  key: string;
  label: string;
  salesCount: number;
  totalIncomeMinor: number;
  cashMinor?: number;
  mobileMoneyMinor?: number;
}

interface ReportsViewProps {
  summary: ReportSummary;
  byBranch: DimensionBreakdownItem[];
  byCashier: DimensionBreakdownItem[];
  byHour: DimensionBreakdownItem[];
  loading?: boolean;
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  branches: Array<{ id: string; name: string }>;
  onExportCsv: (dateRange: string, branchId: string) => Promise<void>;
}

export function ReportsView({
  summary,
  byBranch,
  byCashier,
  byHour,
  loading,
  selectedBranchId,
  onBranchChange,
  branches,
  onExportCsv,
}: ReportsViewProps) {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month'>('7days');
  const [dimensionTab, setDimensionTab] = useState<'branch' | 'cashier' | 'hour'>('branch');
  const [isExporting, setIsExporting] = useState(false);

  if (loading) {
    return <TableSkeleton rows={6} cols={4} />;
  }

  const totalPaymentMinor = summary.cashIncomeMinor + summary.mobileMoneyIncomeMinor;
  const cashPercent =
    totalPaymentMinor > 0 ? Math.round((summary.cashIncomeMinor / totalPaymentMinor) * 100) : 0;
  const mmPercent = totalPaymentMinor > 0 ? 100 - cashPercent : 0;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportCsv(timeRange, selectedBranchId);
    } finally {
      setIsExporting(false);
    }
  };

  const currentBreakdown =
    dimensionTab === 'branch' ? byBranch : dimensionTab === 'cashier' ? byCashier : byHour;

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Time range buttons */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                timeRange === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                timeRange === '7days'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                timeRange === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Branch filter dropdown */}
          <select
            value={selectedBranchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* CSV Export Button */}
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          {isExporting ? 'Exporting...' : 'Export CSV (Sanitized)'}
        </button>
      </div>

      {/* KPI & Payment Ratio Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total revenue card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Gross Sales Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatBirr(summary.grossIncomeMinor)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {summary.salesCount} verified completed transactions
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Voided Sales:</span>
            <span className="font-semibold text-red-700">
              {formatBirr(summary.voidMinor)} ({summary.voidCount})
            </span>
          </div>
        </div>

        {/* Payment method ratio bar card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              Cash vs. Mobile Money Payment Ratio
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              Total {formatBirr(totalPaymentMinor)}
            </span>
          </div>

          {/* Visual Ratio Bar */}
          <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden flex mb-3 p-0.5">
            <div
              className="bg-emerald-600 h-full rounded-l-md transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
              style={{ width: `${cashPercent}%` }}
              title={`Cash: ${cashPercent}%`}
            >
              {cashPercent > 15 ? `${cashPercent}% Cash` : ''}
            </div>
            <div
              className="bg-blue-600 h-full rounded-r-md transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
              style={{ width: `${mmPercent}%` }}
              title={`Mobile Money: ${mmPercent}%`}
            >
              {mmPercent > 15 ? `${mmPercent}% Mobile` : ''}
            </div>
          </div>

          {/* Breakdown detail badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <span className="text-emerald-800 font-semibold block text-[11px]">Physical Cash</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatBirr(summary.cashIncomeMinor)}
              </span>
              <span className="text-[10px] text-emerald-600 block">{cashPercent}% of total</span>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100">
              <span className="text-amber-800 font-semibold block text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Telebirr
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {formatBirr(summary.telebirrIncomeMinor)}
              </span>
              <span className="text-[10px] text-amber-700 block">Instant Verified</span>
            </div>

            <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-100 col-span-2 sm:col-span-1">
              <span className="text-purple-800 font-semibold block text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                CBE Birr
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {formatBirr(summary.cbeIncomeMinor)}
              </span>
              <span className="text-[10px] text-purple-700 block">Instant Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dimensional Breakdown Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Sub-tabs header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex bg-slate-200/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setDimensionTab('branch')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                dimensionTab === 'branch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Branch
            </button>
            <button
              type="button"
              onClick={() => setDimensionTab('cashier')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                dimensionTab === 'cashier'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Cashier
            </button>
            <button
              type="button"
              onClick={() => setDimensionTab('hour')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                dimensionTab === 'hour'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hourly Distribution
            </button>
          </div>
        </div>

        {/* Breakdown table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/75 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">
                  {dimensionTab === 'branch'
                    ? 'Branch'
                    : dimensionTab === 'cashier'
                    ? 'Cashier'
                    : 'Time Interval'}
                </th>
                <th className="px-4 py-3 text-center">Transactions</th>
                <th className="px-4 py-3 text-right">Cash Received</th>
                <th className="px-4 py-3 text-right">Mobile Money</th>
                <th className="px-4 py-3 text-right font-black">Gross Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentBreakdown.map((item) => (
                <tr key={item.key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.label}</td>
                  <td className="px-4 py-3 text-center text-slate-700 font-medium">
                    {item.salesCount}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                    {item.cashMinor !== undefined ? formatBirr(item.cashMinor) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700 font-medium">
                    {item.mobileMoneyMinor !== undefined ? formatBirr(item.mobileMoneyMinor) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">
                    {formatBirr(item.totalIncomeMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
