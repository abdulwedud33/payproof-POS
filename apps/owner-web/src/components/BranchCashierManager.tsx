'use client';

import React, { useState } from 'react';
import { Store, UserCheck, Plus, MapPin, Users, KeyRound, Shield, Check, X } from 'lucide-react';
import { formatEthiopianDate } from '@payproof/shared-types';
import { TableSkeleton } from './Skeleton';

export interface BranchItem {
  id: string;
  name: string;
  code: string;
  location?: string;
  active_cashiers_count: number;
  created_at: string;
}

export interface CashierItem {
  id: string;
  name: string;
  username: string;
  branch_id: string;
  branch_name: string;
  active: boolean;
  created_at: string;
}

interface BranchCashierManagerProps {
  branches: BranchItem[];
  cashiers: CashierItem[];
  loading?: boolean;
  onAddBranch: (data: { name: string; code: string; location?: string }) => Promise<void>;
  onAddCashier: (data: {
    name: string;
    username: string;
    branch_id: string;
    pin: string;
  }) => Promise<void>;
  calendarSystem?: 'GC' | 'EC';
  locale?: 'en' | 'am' | 'om';
}

export function BranchCashierManager({
  branches,
  cashiers,
  loading,
  onAddBranch,
  onAddCashier,
  calendarSystem = 'EC',
  locale = 'en',
}: BranchCashierManagerProps) {
  const [subTab, setSubTab] = useState<'branches' | 'cashiers'>('branches');
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isAddCashierOpen, setIsAddCashierOpen] = useState(false);

  // Add branch form state
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchLocation, setBranchLocation] = useState('');

  // Add cashier form state
  const [cashierName, setCashierName] = useState('');
  const [cashierUsername, setCashierUsername] = useState('');
  const [cashierBranchId, setCashierBranchId] = useState(branches[0]?.id || '');
  const [cashierPin, setCashierPin] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return <TableSkeleton rows={4} cols={4} />;
  }

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddBranch({
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        location: branchLocation.trim() || undefined,
      });
      setBranchName('');
      setBranchCode('');
      setBranchLocation('');
      setIsAddBranchOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierName.trim() || !cashierUsername.trim() || !cashierPin.trim()) return;
    if (cashierPin.length < 4 || !/^\d+$/.test(cashierPin)) {
      alert('Cashier PIN must be 4 to 6 numeric digits');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddCashier({
        name: cashierName.trim(),
        username: cashierUsername.trim().toLowerCase(),
        branch_id: cashierBranchId || branches[0]?.id || '',
        pin: cashierPin.trim(),
      });
      setCashierName('');
      setCashierUsername('');
      setCashierPin('');
      setIsAddCashierOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Sub-tabs header */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div className="flex bg-slate-200/80 p-0.5 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setSubTab('branches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              subTab === 'branches'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-blue-600" />
            Branches ({branches.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('cashiers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              subTab === 'cashiers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Cashiers ({cashiers.length})
          </button>
        </div>

        <div>
          {subTab === 'branches' ? (
            <button
              type="button"
              onClick={() => setIsAddBranchOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Branch
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddCashierOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Cashier
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab content */}
      {subTab === 'branches' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/75 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Branch Name</th>
                <th className="px-4 py-3">Branch Code</th>
                <th className="px-4 py-3">Location / Address</th>
                <th className="px-4 py-3 text-center">Active Cashiers</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    {b.name}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">{b.code}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {b.location || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      <Users className="w-3 h-3" />
                      {b.active_cashiers_count} cashiers
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-medium text-xs">
                    {calendarSystem === 'EC'
                      ? formatEthiopianDate(b.created_at, locale, { short: true })
                      : new Date(b.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/75 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Username / ID</th>
                <th className="px-4 py-3">Assigned Branch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashiers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    {c.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">@{c.username}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.branch_name}</td>
                  <td className="px-4 py-3">
                    {c.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-500">
                        <X className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-medium text-xs">
                    {calendarSystem === 'EC'
                      ? formatEthiopianDate(c.created_at, locale, { short: true })
                      : new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Branch Modal */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Supermarket Branch</h3>
            <p className="text-xs text-slate-500 mb-4">
              Register a new physical location for inventory and cashier terminal operations.
            </p>

            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Piassa Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PIA-01"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono uppercase border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Addis Ababa, Piassa Churchill Ave"
                  value={branchLocation}
                  onChange={(e) => setBranchLocation(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddBranchOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Cashier Modal */}
      {isAddCashierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Cashier Operator</h3>
            <p className="text-xs text-slate-500 mb-4">
              Create credentials for cashier tablet terminal login with a secure PIN.
            </p>

            <form onSubmit={handleCreateCashier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tigist Haile"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. tigist.h"
                  value={cashierUsername}
                  onChange={(e) => setCashierUsername(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={cashierBranchId}
                  onChange={(e) => setCashierBranchId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Terminal Login PIN (4-6 Digits) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="e.g. 1234"
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono tracking-widest border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddCashierOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Cashier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
