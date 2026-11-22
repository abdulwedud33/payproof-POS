import { describe, it, expect } from 'vitest';
import {
  ReportSummaryResponseSchema,
  ReportBreakdownResponseSchema,
  ResolveAlertSchema,
} from './index.js';

describe('Reports & Alerts Schemas (Milestone 6)', () => {
  it('validates and transforms ReportSummaryResponse with BigInt money amounts', () => {
    const raw = {
      totalIncomeMinor: 4823000, // 48,230.00 Birr
      salesCount: 214,
      itemsSoldCount: 1102,
      averageTicketMinor: 22537,
      cashIncomeMinor: 2680000,
      mobileIncomeMinor: 2143000,
      protectedAmountMinor: 482000, // 4,820.00 Birr protected
      alertsCount: 3,
      incomeGrowthPct: 8.5,
    };

    const parsed = ReportSummaryResponseSchema.parse(raw);
    expect(parsed.totalIncomeMinor).toBe(4823000n);
    expect(parsed.protectedAmountMinor).toBe(482000n);
    expect(parsed.salesCount).toBe(214);
    expect(parsed.alertsCount).toBe(3);
  });

  it('validates dimensional breakdown responses', () => {
    const raw = {
      dimension: 'branch',
      totalMinor: 4823000,
      items: [
        {
          id: 'branch-bole',
          label: 'Bole Branch',
          salesCount: 110,
          incomeMinor: 2140000,
          percentage: 44.4,
        },
        {
          id: 'branch-piassa',
          label: 'Piassa Branch',
          salesCount: 65,
          incomeMinor: 1512000,
          percentage: 31.3,
        },
        {
          id: 'branch-adama',
          label: 'Adama Branch',
          salesCount: 39,
          incomeMinor: 1171000,
          percentage: 24.3,
        },
      ],
    };

    const parsed = ReportBreakdownResponseSchema.parse(raw);
    expect(parsed.dimension).toBe('branch');
    expect(parsed.items.length).toBe(3);
    expect(parsed.items[0]?.incomeMinor).toBe(2140000n);
  });

  it('validates alert resolution note requirements', () => {
    expect(() => ResolveAlertSchema.parse({ resolvedNote: 'ok' })).toThrow();
    const valid = ResolveAlertSchema.parse({
      resolvedNote: 'Customer re-scanned and verified under correct branch account',
    });
    expect(valid.resolvedNote).toContain('Customer re-scanned');
  });
});
