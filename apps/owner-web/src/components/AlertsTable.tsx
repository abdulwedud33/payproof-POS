'use client';

import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Info, CheckCircle2, Search, Filter } from 'lucide-react';
import { formatBirr } from '@payproof/money';
import { formatEthiopianDate } from '@payproof/shared-types';
import { TableSkeleton } from './Skeleton';

export interface AlertItem {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  branch_name: string;
  cashier_name?: string;
  amount_minor?: number;
  status: 'open' | 'investigating' | 'resolved';
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

interface AlertsTableProps {
  alerts: AlertItem[];
  loading?: boolean;
  onResolveAlert: (alertId: string, notes: string) => Promise<void>;
  calendarSystem?: 'GC' | 'EC';
  locale?: 'en' | 'am' | 'om';
}

export function AlertsTable({
  alerts,
  loading,
  onResolveAlert,
  calendarSystem = 'EC',
  locale = 'en',
}: AlertsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [selectedAlertForResolve, setSelectedAlertForResolve] = useState<AlertItem | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return <TableSkeleton rows={5} cols={5} />;
  }

  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.cashier_name && a.cashier_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'open' && a.status !== 'resolved') ||
      (statusFilter === 'resolved' && a.status === 'resolved');

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const handleOpenResolve = (alert: AlertItem) => {
    setSelectedAlertForResolve(alert);
    setResolveNotes('');
  };

  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForResolve) return;
    setIsSubmitting(true);
    try {
      await onResolveAlert(selectedAlertForResolve.id, resolveNotes);
      setSelectedAlertForResolve(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: AlertItem['severity']) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <ShieldAlert className="w-3 h-3" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3" />
            Info
          </span>
        );
    }
  };

  const getStatusBadge = (status: AlertItem['status']) => {
    if (status === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Open
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search alerts by type, branch, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Severity selector */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warning Only</option>
            <option value="info">Info Only</option>
          </select>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open Alerts</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-100/75 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Severity & Type</th>
              <th className="px-4 py-3">Branch / Cashier</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No alerts found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No security anomalies or duplicate payment claims match the selected filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      <span className="font-mono text-[11px] font-bold text-slate-800">
                        {alert.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{alert.branch_name}</div>
                    {alert.cashier_name && (
                      <div className="text-[11px] text-slate-400">{alert.cashier_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-700" title={alert.message}>
                    {alert.message}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900">
                    {alert.amount_minor !== undefined && alert.amount_minor !== null
                      ? formatBirr(alert.amount_minor)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                    {calendarSystem === 'EC'
                      ? `${formatEthiopianDate(alert.created_at, locale, { short: true })}, ${new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : new Date(alert.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(alert.status)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {alert.status !== 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenResolve(alert)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resolve Modal */}
      {selectedAlertForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Resolve Alert: {selectedAlertForResolve.type}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter verification notes or the explanation for closing this security incident.
            </p>

            <form onSubmit={handleSubmitResolve}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Verified genuine receipt with branch manager; cashier was re-trained on QR scanning."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedAlertForResolve(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !resolveNotes.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
