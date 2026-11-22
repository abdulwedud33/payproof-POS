import { AlertResponse, AlertKind, AlertSeverity } from '@payproof/shared-types';

export interface AlertFilterOptions {
  branchId?: string;
  kind?: AlertKind;
  severity?: AlertSeverity;
  resolved?: boolean;
}

export class AlertService {
  private static alertsStore: AlertResponse[] = [
    {
      id: '88888888-8888-8888-8888-888888888801',
      orgId: '11111111-1111-1111-1111-111111111111',
      branchId: '22222222-2222-2222-2222-222222222221',
      branchName: 'Bole Branch',
      cashierName: 'Dawit Alemu',
      kind: 'duplicate_claim',
      severity: 'critical',
      title: 'Duplicate Claim Attempt Blocked',
      message: 'Transaction TXN_CONCURRENCY_STRESS was already consumed by another sale.',
      metadata: { transactionId: 'TXN_CONCURRENCY_STRESS', provider: 'telebirr', protectedAmountMinor: 15000 },
      resolved: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '88888888-8888-8888-8888-888888888802',
      orgId: '11111111-1111-1111-1111-111111111111',
      branchId: '22222222-2222-2222-2222-222222222222',
      branchName: 'Piassa Branch',
      cashierName: 'Bethelhem Tadesse',
      kind: 'short_payment',
      severity: 'warning',
      title: 'Short Payment Detected',
      message: 'Customer paid 50.00 Birr for a 150.00 Birr total. Shortfall: 100.00 Birr.',
      metadata: { paidMinor: 5000, totalMinor: 15000, shortfallMinor: 10000 },
      resolved: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '88888888-8888-8888-8888-888888888803',
      orgId: '11111111-1111-1111-1111-111111111111',
      branchId: '22222222-2222-2222-2222-222222222223',
      branchName: 'Adama Branch',
      cashierName: 'Yohannes Bekele',
      kind: 'manual_override',
      severity: 'info',
      title: 'Manual Override Approved',
      message: 'Owner PIN verified for verbal bank SMS authorization.',
      metadata: { authorizedBy: 'owner', reason: 'Customer bank debit verified on customer screen' },
      resolved: true,
      resolvedNote: 'Confirmed with branch manager Dawit',
      resolvedAt: new Date(Date.now() - 14400000).toISOString(),
      createdAt: new Date(Date.now() - 18000000).toISOString(),
    },
  ];

  static async listAlerts(orgId: string, options?: AlertFilterOptions): Promise<AlertResponse[]> {
    let result = this.alertsStore.filter((a) => a.orgId === orgId);

    if (options?.branchId) {
      result = result.filter((a) => a.branchId === options.branchId);
    }
    if (options?.kind) {
      result = result.filter((a) => a.kind === options.kind);
    }
    if (options?.severity) {
      result = result.filter((a) => a.severity === options.severity);
    }
    if (options?.resolved !== undefined) {
      result = result.filter((a) => a.resolved === options.resolved);
    }

    return result;
  }

  static async resolveAlert(
    orgId: string,
    alertId: string,
    resolvedNote: string
  ): Promise<AlertResponse> {
    const alert = this.alertsStore.find((a) => a.id === alertId && a.orgId === orgId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.resolved = true;
    alert.resolvedNote = resolvedNote;
    alert.resolvedAt = new Date().toISOString();

    return alert;
  }
}
