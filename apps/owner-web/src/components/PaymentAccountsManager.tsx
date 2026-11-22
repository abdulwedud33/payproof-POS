'use client';

import React, { useState } from 'react';
import { CreditCard, Plus, ShieldCheck, Lock, Check, X, AlertCircle } from 'lucide-react';
import { TableSkeleton } from './Skeleton';

export interface PaymentAccountItem {
  id: string;
  branch_id: string;
  branch_name: string;
  provider: 'telebirr' | 'cbe';
  account_ref_last4: string;
  registered_name_normalized: string;
  active: boolean;
  created_at: string;
}

interface PaymentAccountsManagerProps {
  accounts: PaymentAccountItem[];
  branches: Array<{ id: string; name: string }>;
  loading?: boolean;
  onAddAccount: (data: {
    branch_id: string;
    provider: 'telebirr' | 'cbe';
    account_number: string;
    account_name: string;
    owner_pin: string;
  }) => Promise<void>;
  onToggleActive: (accountId: string, newActive: boolean, owner_pin: string) => Promise<void>;
}

export function PaymentAccountsManager({
  accounts,
  branches,
  loading,
  onAddAccount,
  onToggleActive,
}: PaymentAccountsManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pinActionAccount, setPinActionAccount] = useState<{
    id: string;
    targetActive: boolean;
  } | null>(null);

  // Form state
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [provider, setProvider] = useState<'telebirr' | 'cbe'>('telebirr');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [ownerPin, setOwnerPin] = useState('');

  // Toggle PIN state
  const [togglePin, setTogglePin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (loading) {
    return <TableSkeleton rows={4} cols={5} />;
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!accountNumber.trim() || !accountName.trim() || !ownerPin.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddAccount({
        branch_id: branchId || branches[0]?.id || '',
        provider,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        owner_pin: ownerPin.trim(),
      });
      setAccountNumber('');
      setAccountName('');
      setOwnerPin('');
      setIsAddOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register payment account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!pinActionAccount || !togglePin.trim()) return;

    setIsSubmitting(true);
    try {
      await onToggleActive(pinActionAccount.id, pinActionAccount.targetActive, togglePin.trim());
      setPinActionAccount(null);
      setTogglePin('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Owner PIN verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProviderBadge = (prov: PaymentAccountItem['provider']) => {
    if (prov === 'telebirr') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Telebirr
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
        <span className="w-2 h-2 rounded-full bg-purple-600" />
        CBE Birr
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Receiving Accounts
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cashier verification matches against these official merchant accounts. Protected by Owner PIN.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMessage('');
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Register Account
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-100/75 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Account Number</th>
              <th className="px-4 py-3">Registered Name (Normalized)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No payment accounts registered</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Register your Telebirr or CBE merchant accounts so payments can be verified.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{getProviderBadge(acc.provider)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{acc.branch_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-900 font-semibold">
                    •••• •••• {acc.account_ref_last4}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700 font-medium">
                    {acc.registered_name_normalized}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {acc.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-500">
                        <X className="w-3 h-3" />
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage('');
                        setTogglePin('');
                        setPinActionAccount({ id: acc.id, targetActive: !acc.active });
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors border ${
                        acc.active
                          ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {acc.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Account Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Register Saved Payment Account
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Stored with AES-256-GCM encryption. Requires owner PIN authorization to register.
            </p>

            {errorMessage && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Provider <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProvider('telebirr')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      provider === 'telebirr'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Telebirr
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('cbe')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      provider === 'cbe'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    CBE Birr
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Account Number / Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1000123456789 or 0911223344"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Addis Mart Bole Branch"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  Owner PIN Authorization <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="Enter 4-6 digit Owner PIN"
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono tracking-widest bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Registering...' : 'Authorize & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN Confirmation Modal for Deactivate / Reactivate */}
      {pinActionAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              {pinActionAccount.targetActive ? 'Reactivate' : 'Deactivate'} Payment Account
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter Owner PIN to confirm status change for this payment account.
            </p>

            {errorMessage && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleConfirmToggle}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="Enter 4-6 digit PIN"
                  value={togglePin}
                  onChange={(e) => setTogglePin(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono tracking-widest border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPinActionAccount(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !togglePin.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
