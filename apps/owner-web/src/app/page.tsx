'use client';

import React, { useState } from 'react';
import type { ProductResponse, SaleResponse } from '@payproof/shared-types';
import { formatEthiopianDate } from '@payproof/shared-types';
import { SummaryCards, type SummaryData } from '../components/SummaryCards';
import { ProductTable, type ExtendedProduct } from '../components/ProductTable';
import { SalesTable } from '../components/SalesTable';
import { CsvImportModal } from '../components/CsvImportModal';
import { VoidModal } from '../components/VoidModal';
import { ProtectedStrip, type ProtectedStripData } from '../components/ProtectedStrip';
import { SetupChecklist, type SetupStep } from '../components/SetupChecklist';
import { AlertsTable, type AlertItem } from '../components/AlertsTable';
import {
  BranchCashierManager,
  type BranchItem,
  type CashierItem,
} from '../components/BranchCashierManager';
import {
  PaymentAccountsManager,
  type PaymentAccountItem,
} from '../components/PaymentAccountsManager';
import {
  ReportsView,
  type ReportSummary,
  type DimensionBreakdownItem,
} from '../components/ReportsView';
import { ShiftsTable } from '../components/ShiftsTable';
import type { ShiftResponse } from '@payproof/shared-types';
import { translations, type Locale } from '../i18n';
import {
  Package,
  Receipt,
  RefreshCw,
  LayoutDashboard,
  BarChart3,
  Store,
  CreditCard,
  ShieldAlert,
  Globe,
  Calendar,
  Clock,
} from 'lucide-react';

// Seed Branches
const INITIAL_BRANCHES: BranchItem[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    name: 'Bole Branch',
    code: 'BOLE-01',
    location: 'Addis Ababa, Bole Medhanialem Mall GF',
    active_cashiers_count: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Piassa Branch',
    code: 'PIA-01',
    location: 'Addis Ababa, Piassa Churchill Ave',
    active_cashiers_count: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    name: 'Adama Branch',
    code: 'ADM-01',
    location: 'Adama, Posta Bet Commercial Center',
    active_cashiers_count: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

// Seed Cashiers
const INITIAL_CASHIERS: CashierItem[] = [
  {
    id: '33333333-3333-3333-3333-333333333331',
    name: 'Tigist Haile',
    username: 'tigist.h',
    branch_id: '22222222-2222-2222-2222-222222222221',
    branch_name: 'Bole Branch',
    active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    name: 'Dawit Bekele',
    username: 'dawit.b',
    branch_id: '22222222-2222-2222-2222-222222222221',
    branch_name: 'Bole Branch',
    active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Selamawit Tadesse',
    username: 'selam.t',
    branch_id: '22222222-2222-2222-2222-222222222222',
    branch_name: 'Piassa Branch',
    active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
];

// Seed Saved Payment Accounts
const INITIAL_ACCOUNTS: PaymentAccountItem[] = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    branch_id: '22222222-2222-2222-2222-222222222221',
    branch_name: 'Bole Branch',
    provider: 'telebirr',
    account_ref_last4: '6789',
    registered_name_normalized: 'ADDIS MART BOLE BRANCH',
    active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    branch_id: '22222222-2222-2222-2222-222222222221',
    branch_name: 'Bole Branch',
    provider: 'cbe',
    account_ref_last4: '9901',
    registered_name_normalized: 'ADDIS MART BOLE BRANCH',
    active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444443',
    branch_id: '22222222-2222-2222-2222-222222222222',
    branch_name: 'Piassa Branch',
    provider: 'telebirr',
    account_ref_last4: '4321',
    registered_name_normalized: 'ADDIS MART PIASSA BRANCH',
    active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
];

// Seed Fraud Alerts
const INITIAL_ALERTS: AlertItem[] = [
  {
    id: '55555555-5555-5555-5555-555555555551',
    type: 'DOUBLE_SPEND_ATTEMPT',
    severity: 'critical',
    message: 'Customer attempted to present claimed transaction TXN-TB-982104 to cashier Tigist.',
    branch_name: 'Bole Branch',
    cashier_name: 'Tigist Haile',
    amount_minor: 45000,
    status: 'open',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555552',
    type: 'MISMATCHED_RECEIVER',
    severity: 'warning',
    message: 'Payment receiver 1000998877665 does not match registered branch account.',
    branch_name: 'Piassa Branch',
    cashier_name: 'Selamawit Tadesse',
    amount_minor: 18000,
    status: 'resolved',
    resolved_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    resolution_notes:
      'Customer transferred to personal phone instead of official merchant QR. Rectified.',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

// Seed Products with Stock Tracking
const INITIAL_PRODUCTS: ExtendedProduct[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    org_id: '11111111-1111-1111-1111-111111111111',
    name: 'Magna Teff 1kg',
    name_local: 'የማግና ጤፍ 1ኪ.ግ',
    sku: 'TEF-MAG-01',
    unit: 'kg',
    price_minor: 12500,
    stock_quantity: 4,
    low_stock_threshold: 10,
    active: true,
    barcodes: ['690100100001'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    org_id: '11111111-1111-1111-1111-111111111111',
    name: 'Shiro Powder Special 500g',
    name_local: 'ልዩ የሽሮ ዱቄት 500ግራም',
    sku: 'SPC-SHR-05',
    unit: 'pack',
    price_minor: 16000,
    stock_quantity: 35,
    low_stock_threshold: 10,
    active: true,
    barcodes: ['690100100010'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    org_id: '11111111-1111-1111-1111-111111111111',
    name: 'Sunflower Cooking Oil 1L',
    name_local: 'የሱፍ የምግብ ዘይት 1ሊትር',
    sku: 'OIL-SNF-01',
    unit: 'litre',
    price_minor: 32000,
    stock_quantity: 6,
    low_stock_threshold: 10,
    active: true,
    barcodes: ['690100100030'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111104',
    org_id: '11111111-1111-1111-1111-111111111111',
    name: 'Shola Fresh Milk 500ml',
    name_local: 'ሾላ ወተት 500ሚ.ሊ',
    sku: 'MLK-SHL-05',
    unit: 'piece',
    price_minor: 6000,
    stock_quantity: 48,
    low_stock_threshold: 10,
    active: true,
    barcodes: ['690100100040'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111105',
    org_id: '11111111-1111-1111-1111-111111111111',
    name: 'Fresh Injera (Pack of 10)',
    name_local: 'ትኩስ እንጀራ (10 ፍሬ)',
    sku: 'INJ-PCK-10',
    unit: 'pack',
    price_minor: 18000,
    stock_quantity: 18,
    low_stock_threshold: 10,
    active: true,
    barcodes: ['690100100050'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111106',
    org_id: '11111111-1111-1111-1111-111111111111',
    name: 'Ambo Mineral Water 500ml',
    name_local: 'አምቦ ውሀ 500ሚ.ሊ',
    sku: 'BEV-AMB-05',
    unit: 'piece',
    price_minor: 3500,
    stock_quantity: 82,
    low_stock_threshold: 10,
    active: true,
    barcodes: ['690100100070'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

// Seed Sales
const INITIAL_SALES: SaleResponse[] = [
  {
    id: '99999999-9999-9999-9999-999999999901',
    org_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '22222222-2222-2222-2222-222222222221',
    cashier_id: '33333333-3333-3333-3333-333333333331',
    status: 'paid',
    payment_method: 'mobile_money',
    subtotal_minor: 31000,
    total_minor: 31000,
    cash_received_minor: null,
    overpaid_minor: 0,
    idempotency_key: 'idemp-sale-01',
    client_created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    items: [],
  },
  {
    id: '99999999-9999-9999-9999-999999999902',
    org_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '22222222-2222-2222-2222-222222222221',
    cashier_id: '33333333-3333-3333-3333-333333333331',
    status: 'paid',
    payment_method: 'cash',
    subtotal_minor: 18000,
    total_minor: 18000,
    cash_received_minor: 20000,
    overpaid_minor: 2000,
    idempotency_key: 'idemp-sale-02',
    client_created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    items: [],
  },
  {
    id: '99999999-9999-9999-9999-999999999903',
    org_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '22222222-2222-2222-2222-222222222222',
    cashier_id: '33333333-3333-3333-3333-333333333333',
    status: 'paid',
    payment_method: 'mobile_money',
    subtotal_minor: 49000,
    total_minor: 49000,
    cash_received_minor: null,
    overpaid_minor: 0,
    idempotency_key: 'idemp-sale-03',
    client_created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    items: [],
  },
];

// Seed Shifts
const INITIAL_SHIFTS: ShiftResponse[] = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    org_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '22222222-2222-2222-2222-222222222221',
    branch_name: 'Bole Branch',
    cashier_id: '33333333-3333-3333-3333-333333333331',
    cashier_name: 'Tigist Haile',
    opening_float_minor: 50000,
    expected_cash_minor: 125000,
    actual_cash_minor: 125000,
    cash_difference_minor: 0,
    total_mobile_money_minor: 180000,
    total_sales_count: 14,
    total_void_count: 1,
    status: 'closed',
    notes: 'Morning shift balanced accurately',
    opened_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    closed_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    org_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '22222222-2222-2222-2222-222222222221',
    branch_name: 'Bole Branch',
    cashier_id: '33333333-3333-3333-3333-333333333332',
    cashier_name: 'Dawit Bekele',
    opening_float_minor: 50000,
    expected_cash_minor: 84000,
    actual_cash_minor: null,
    cash_difference_minor: null,
    total_mobile_money_minor: 110000,
    total_sales_count: 8,
    total_void_count: 0,
    status: 'open',
    notes: 'Afternoon peak shift active',
    opened_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    closed_at: null,
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'reports' | 'branches' | 'accounts' | 'alerts' | 'products' | 'sales' | 'shifts'
  >('overview');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [locale, setLocale] = useState<Locale>('en');
  const [calendarSystem, setCalendarSystem] = useState<'GC' | 'EC'>('EC');
  const [loading, setLoading] = useState(false);

  const t = translations[locale];

  // Core Data States
  const [branches, setBranches] = useState<BranchItem[]>(INITIAL_BRANCHES);
  const [cashiers, setCashiers] = useState<CashierItem[]>(INITIAL_CASHIERS);
  const [accounts, setAccounts] = useState<PaymentAccountItem[]>(INITIAL_ACCOUNTS);
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [shifts, setShifts] = useState<ShiftResponse[]>(INITIAL_SHIFTS);
  const [products, setProducts] = useState<ExtendedProduct[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<SaleResponse[]>(INITIAL_SALES);
  const [filteredProducts, setFilteredProducts] = useState<ExtendedProduct[]>(INITIAL_PRODUCTS);

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [voidingSale, setVoidingSale] = useState<SaleResponse | null>(null);

  // Setup steps
  const setupSteps: SetupStep[] = [
    {
      id: 'step-branch',
      title: '1. Register Supermarket Branches',
      description: 'Physical branches for multi-outlet operations (Bole, Piassa, Adama).',
      completed: branches.length > 0,
      actionTab: 'branches',
    },
    {
      id: 'step-cashier',
      title: '2. Create Cashier Accounts & PINs',
      description: 'Assign operators to POS checkout tablets with quick PIN logins.',
      completed: cashiers.length > 0,
      actionTab: 'branches',
    },
    {
      id: 'step-account',
      title: '3. Save & Verify Official Payment Accounts',
      description: 'Telebirr and CBE merchant accounts verified by Owner PIN.',
      completed: accounts.length > 0,
      actionTab: 'accounts',
    },
    {
      id: 'step-catalog',
      title: '4. Upload Price Catalog & Barcodes',
      description: 'Ethiopian supermarket inventory with local Amharic names and prices in Santim.',
      completed: products.length > 0,
      actionTab: 'products',
    },
  ];

  // Filter sales by selected branch
  const activeBranchSales =
    selectedBranchId === 'all' ? sales : sales.filter((s) => s.branch_id === selectedBranchId);

  // Protected Strip Data
  const protectedData: ProtectedStripData = {
    suspiciousAttemptsCaught: 14,
    totalBirrProtectedMinor: 3825000, // 38,250 Birr
    doubleSpendsPrevented: 9,
    underpaidPrevented: 5,
  };

  // Summary KPI Data
  const summaryData: SummaryData = {
    totalSalesCount: activeBranchSales.filter((s) => s.status === 'paid').length,
    grossSalesMinor: activeBranchSales
      .filter((s) => s.status === 'paid')
      .reduce((sum, s) => sum + s.total_minor, 0),
    voidCount: activeBranchSales.filter((s) => s.status === 'voided').length,
    voidMinor: activeBranchSales
      .filter((s) => s.status === 'voided')
      .reduce((sum, s) => sum + s.total_minor, 0),
  };

  // Reports data
  const reportSummary: ReportSummary = {
    grossIncomeMinor: Number(summaryData.grossSalesMinor),
    salesCount: summaryData.totalSalesCount,
    cashIncomeMinor: activeBranchSales
      .filter((s) => s.status === 'paid' && s.payment_method === 'cash')
      .reduce((sum, s) => sum + s.total_minor, 0),
    mobileMoneyIncomeMinor: activeBranchSales
      .filter((s) => s.status === 'paid' && s.payment_method === 'mobile_money')
      .reduce((sum, s) => sum + s.total_minor, 0),
    telebirrIncomeMinor: Math.round(
      activeBranchSales
        .filter((s) => s.status === 'paid' && s.payment_method === 'mobile_money')
        .reduce((sum, s) => sum + s.total_minor, 0) * 0.65
    ),
    cbeIncomeMinor: Math.round(
      activeBranchSales
        .filter((s) => s.status === 'paid' && s.payment_method === 'mobile_money')
        .reduce((sum, s) => sum + s.total_minor, 0) * 0.35
    ),
    voidMinor: Number(summaryData.voidMinor),
    voidCount: summaryData.voidCount,
  };

  // Dimensional breakdowns
  const breakdownByBranch: DimensionBreakdownItem[] = branches.map((b) => {
    const branchSales = sales.filter((s) => s.branch_id === b.id && s.status === 'paid');
    const cash = branchSales
      .filter((s) => s.payment_method === 'cash')
      .reduce((acc, s) => acc + s.total_minor, 0);
    const mm = branchSales
      .filter((s) => s.payment_method === 'mobile_money')
      .reduce((acc, s) => acc + s.total_minor, 0);
    return {
      key: b.id,
      label: b.name,
      salesCount: branchSales.length,
      cashMinor: cash,
      mobileMoneyMinor: mm,
      totalIncomeMinor: cash + mm,
    };
  });

  const breakdownByCashier: DimensionBreakdownItem[] = cashiers.map((c) => {
    const cashierSales = sales.filter((s) => s.cashier_id === c.id && s.status === 'paid');
    const cash = cashierSales
      .filter((s) => s.payment_method === 'cash')
      .reduce((acc, s) => acc + s.total_minor, 0);
    const mm = cashierSales
      .filter((s) => s.payment_method === 'mobile_money')
      .reduce((acc, s) => acc + s.total_minor, 0);
    return {
      key: c.id,
      label: `${c.name} (@${c.username})`,
      salesCount: cashierSales.length,
      cashMinor: cash,
      mobileMoneyMinor: mm,
      totalIncomeMinor: cash + mm,
    };
  });

  const breakdownByHour: DimensionBreakdownItem[] = [
    {
      key: '08-11',
      label: 'Morning (08:00 - 11:59)',
      salesCount: 14,
      totalIncomeMinor: 1420000,
      cashMinor: 600000,
      mobileMoneyMinor: 820000,
    },
    {
      key: '12-14',
      label: 'Lunch Rush (12:00 - 14:59)',
      salesCount: 28,
      totalIncomeMinor: 3120000,
      cashMinor: 1100000,
      mobileMoneyMinor: 2020000,
    },
    {
      key: '15-18',
      label: 'Afternoon Peak (15:00 - 18:59)',
      salesCount: 35,
      totalIncomeMinor: 4820000,
      cashMinor: 1520000,
      mobileMoneyMinor: 3300000,
    },
    {
      key: '19-21',
      label: 'Evening Close (19:00 - 21:00)',
      salesCount: 12,
      totalIncomeMinor: 980000,
      cashMinor: 420000,
      mobileMoneyMinor: 560000,
    },
  ];

  const handleSearch = (term: string) => {
    if (!term.trim()) {
      setFilteredProducts(products);
      return;
    }
    const lower = term.toLowerCase();
    const matched = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.name_local && p.name_local.toLowerCase().includes(lower)) ||
        (p.sku && p.sku.toLowerCase().includes(lower)) ||
        (p.barcodes && p.barcodes.some((b) => b.toLowerCase().includes(lower)))
    );
    setFilteredProducts(matched);
  };

  const handleAddProduct = () => {
    const newName = prompt('Enter item name (e.g. Sergegna Teff 1kg):');
    if (!newName) return;
    const priceStr = prompt('Enter price in Birr (e.g. 110.00):');
    if (!priceStr) return;
    const priceMinor = Math.round(Number.parseFloat(priceStr) * 100);

    const newProd: ProductResponse = {
      id: crypto.randomUUID(),
      org_id: '11111111-1111-1111-1111-111111111111',
      name: newName,
      unit: 'piece',
      price_minor: priceMinor,
      active: true,
      barcodes: [],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const updated = [newProd, ...products];
    setProducts(updated);
    setFilteredProducts(updated);
  };

  const handleRestockProduct = (productId: string, amount: number) => {
    const update = (list: ExtendedProduct[]) =>
      list.map((p) =>
        p.id === productId ? { ...p, stock_quantity: (p.stock_quantity ?? 0) + amount } : p
      );
    setProducts(update);
    setFilteredProducts(update);
  };

  const handleImportCsv = async (csvText: string) => {
    const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
    const addedCount = Math.max(1, lines.length - 1);
    return { imported: addedCount, errors: [] };
  };

  const handleConfirmVoid = async (saleId: string, reason: string) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'voided',
              void_reason: reason,
              voided_at: new Date().toISOString(),
            }
          : s
      )
    );
  };

  const handleResolveAlert = async (alertId: string, notes: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              resolution_notes: notes,
            }
          : a
      )
    );
  };

  const handleAddBranch = async (data: { name: string; code: string; location?: string }) => {
    const newBranch: BranchItem = {
      id: crypto.randomUUID(),
      name: data.name,
      code: data.code,
      location: data.location,
      active_cashiers_count: 0,
      created_at: new Date().toISOString(),
    };
    setBranches((prev) => [...prev, newBranch]);
  };

  const handleAddCashier = async (data: {
    name: string;
    username: string;
    branch_id: string;
    pin: string;
  }) => {
    const assignedBranch = branches.find((b) => b.id === data.branch_id);
    const newCashier: CashierItem = {
      id: crypto.randomUUID(),
      name: data.name,
      username: data.username,
      branch_id: data.branch_id,
      branch_name: assignedBranch ? assignedBranch.name : 'Unknown Branch',
      active: true,
      created_at: new Date().toISOString(),
    };
    setCashiers((prev) => [...prev, newCashier]);
    setBranches((prev) =>
      prev.map((b) =>
        b.id === data.branch_id ? { ...b, active_cashiers_count: b.active_cashiers_count + 1 } : b
      )
    );
  };

  const handleAddAccount = async (data: {
    branch_id: string;
    provider: 'telebirr' | 'cbe';
    account_number: string;
    account_name: string;
    owner_pin: string;
  }) => {
    if (data.owner_pin !== '1234' && data.owner_pin !== '9999') {
      throw new Error('Invalid Owner PIN. Authorization rejected.');
    }
    const assignedBranch = branches.find((b) => b.id === data.branch_id);
    const last4 = data.account_number.slice(-4);
    const newAcc: PaymentAccountItem = {
      id: crypto.randomUUID(),
      branch_id: data.branch_id,
      branch_name: assignedBranch ? assignedBranch.name : 'Bole Branch',
      provider: data.provider,
      account_ref_last4: last4,
      registered_name_normalized: data.account_name.toUpperCase(),
      active: true,
      created_at: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAcc]);
  };

  const handleToggleAccountActive = async (
    accountId: string,
    newActive: boolean,
    owner_pin: string
  ) => {
    if (owner_pin !== '1234' && owner_pin !== '9999') {
      throw new Error('Invalid Owner PIN. Authorization rejected.');
    }
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, active: newActive } : a)));
  };

  const handleExportCsv = async (timeRange: string, branchId: string) => {
    // Generate sanitized CSV content following CWE-1236 mitigation
    const header = [
      'Transaction ID',
      'Branch',
      'Cashier',
      'Payment Method',
      'Amount (Birr)',
      'Status',
      'Date',
    ];
    const rows = activeBranchSales.map((s) => {
      const branch = branches.find((b) => b.id === s.branch_id)?.name || 'Bole Branch';
      const cashier = cashiers.find((c) => c.id === s.cashier_id)?.name || 'Cashier 1';
      const sanitize = (val: string) => (/^[=+\-@\t\r]/.test(val) ? `'${val}` : val);
      return [
        sanitize(s.id),
        sanitize(branch),
        sanitize(cashier),
        sanitize(s.payment_method || 'unspecified'),
        (s.total_minor / 100).toFixed(2),
        s.status,
        new Date(s.created_at).toISOString(),
      ];
    });

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payproof_sales_${branchId}_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleLoadingSimulation = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <div>
      {/* Top Banner, Multi-Branch Selector & Control */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.appName} · {t.appSubtitle}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Multi-branch management, fraud prevention journal, and real-time cashier monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-Branch Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <Store className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent py-1 pr-3 focus:outline-hidden cursor-pointer"
            >
              <option value="all">{t.allBranches}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Language Switcher (Amharic / English / Afaan Oromoo) */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="text-xs font-semibold text-slate-800 bg-transparent py-1 pr-2 focus:outline-hidden cursor-pointer"
            >
              <option value="en">English (EN)</option>
              <option value="am">አማርኛ (AM)</option>
              <option value="om">Afaan Oromoo (OM)</option>
            </select>
          </div>

          {/* Calendar System Switcher (Gregorian G.C. vs Ethiopian E.C. / ዓ.ም.) */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={calendarSystem}
              onChange={(e) => setCalendarSystem(e.target.value as 'GC' | 'EC')}
              className="text-xs font-semibold text-slate-800 bg-transparent py-1 pr-2 focus:outline-hidden cursor-pointer"
              title="Toggle Gregorian vs Ethiopian Calendar"
            >
              <option value="EC">📅 {t.ethiopian}</option>
              <option value="GC">📅 {t.gregorian}</option>
            </select>
          </div>

          {/* Today Date Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/80 border border-amber-200/90 rounded-lg text-xs font-semibold text-amber-900 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-700">{t.currentDate}:</span>
            <span>
              {calendarSystem === 'EC'
                ? formatEthiopianDate(new Date(), locale)
                : new Date().toLocaleDateString(
                    locale === 'am' ? 'am-ET' : locale === 'om' ? 'om-ET' : 'en-US',
                    {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  )}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleLoadingSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Simulate network load to inspect zero-CLS layout skeletons"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t.refresh}
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          {t.overview}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'reports'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {t.reports}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'branches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          {t.branchesAndCashiers}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {t.savedAccounts}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'alerts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          {t.fraudAlerts} ({alerts.filter((a) => a.status === 'open').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          {t.catalogProducts} ({filteredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          {t.salesJournal} ({activeBranchSales.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'shifts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t.shiftsDrawer} ({shifts.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div>
          {/* Protected this week strip */}
          <ProtectedStrip
            data={protectedData}
            loading={loading}
            onViewAlerts={() => setActiveTab('alerts')}
          />

          {/* Setup Progress Checklist */}
          <SetupChecklist
            steps={setupSteps}
            onNavigateTab={(tab) => {
              if (tab === 'branches') setActiveTab('branches');
              else if (tab === 'accounts') setActiveTab('accounts');
              else if (tab === 'products') setActiveTab('products');
            }}
          />

          {/* KPI Summary Cards */}
          <SummaryCards data={summaryData} loading={loading} />

          {/* Recent Sales Journal Snapshot */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View Full Journal →
              </button>
            </div>
            <SalesTable
              sales={activeBranchSales.slice(0, 5)}
              loading={loading}
              onVoidClick={(sale) => setVoidingSale(sale)}
              calendarSystem={calendarSystem}
              locale={locale}
            />
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <ReportsView
          summary={reportSummary}
          byBranch={breakdownByBranch}
          byCashier={breakdownByCashier}
          byHour={breakdownByHour}
          loading={loading}
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          branches={branches}
          onExportCsv={handleExportCsv}
          calendarSystem={calendarSystem}
          locale={locale}
        />
      )}

      {activeTab === 'branches' && (
        <BranchCashierManager
          branches={branches}
          cashiers={cashiers}
          loading={loading}
          onAddBranch={handleAddBranch}
          onAddCashier={handleAddCashier}
          calendarSystem={calendarSystem}
          locale={locale}
        />
      )}

      {activeTab === 'accounts' && (
        <PaymentAccountsManager
          accounts={accounts}
          branches={branches}
          loading={loading}
          onAddAccount={handleAddAccount}
          onToggleActive={handleToggleAccountActive}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsTable
          alerts={alerts}
          loading={loading}
          onResolveAlert={handleResolveAlert}
          calendarSystem={calendarSystem}
          locale={locale}
        />
      )}

      {activeTab === 'products' && (
        <ProductTable
          products={filteredProducts}
          loading={loading}
          onSearch={handleSearch}
          onAddProduct={handleAddProduct}
          onOpenImport={() => setIsImportOpen(true)}
          onRestockProduct={handleRestockProduct}
        />
      )}

      {activeTab === 'sales' && (
        <SalesTable
          sales={activeBranchSales}
          loading={loading}
          onVoidClick={(sale) => setVoidingSale(sale)}
          calendarSystem={calendarSystem}
          locale={locale}
        />
      )}

      {activeTab === 'shifts' && (
        <ShiftsTable
          shifts={
            selectedBranchId === 'all'
              ? shifts
              : shifts.filter((s) => s.branch_id === selectedBranchId)
          }
          loading={loading}
          calendarSystem={calendarSystem}
          locale={locale}
        />
      )}

      {/* Modals */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportCsv}
      />

      <VoidModal
        sale={voidingSale}
        onClose={() => setVoidingSale(null)}
        onConfirmVoid={handleConfirmVoid}
      />
    </div>
  );
}
