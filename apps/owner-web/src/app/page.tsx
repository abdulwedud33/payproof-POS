'use client';

import React, { useState, useEffect } from 'react';
import type { ProductResponse, SaleResponse } from '@payproof/shared-types';
import { SummaryCards, type SummaryData } from '../components/SummaryCards';
import { ProductTable } from '../components/ProductTable';
import { SalesTable } from '../components/SalesTable';
import { CsvImportModal } from '../components/CsvImportModal';
import { VoidModal } from '../components/VoidModal';
import { Package, Receipt, RefreshCw } from 'lucide-react';

const INITIAL_PRODUCTS: ProductResponse[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    org_id: '11111111-1111-1111-1111-111111111111',
    name: 'Magna Teff 1kg',
    name_local: 'የማግና ጤፍ 1ኪ.ግ',
    sku: 'TEF-MAG-01',
    unit: 'kg',
    price_minor: 12500,
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
    active: true,
    barcodes: ['690100100070'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

const INITIAL_SALES: SaleResponse[] = [
  {
    id: '99999999-9999-9999-9999-999999999901',
    org_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '22222222-2222-2222-2222-222222222221',
    cashier_id: '33333333-3333-3333-3333-333333333331',
    status: 'paid',
    payment_method: 'cash',
    subtotal_minor: 31000,
    total_minor: 31000,
    cash_received_minor: 35000,
    overpaid_minor: 4000,
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
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'sales'>('products');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductResponse[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<SaleResponse[]>(INITIAL_SALES);
  const [filteredProducts, setFilteredProducts] = useState<ProductResponse[]>(INITIAL_PRODUCTS);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [voidingSale, setVoidingSale] = useState<SaleResponse | null>(null);

  // Compute summary stats dynamically
  const summaryData: SummaryData = {
    totalSalesCount: sales.filter((s) => s.status === 'paid').length,
    grossSalesMinor: sales
      .filter((s) => s.status === 'paid')
      .reduce((sum, s) => sum + s.total_minor, 0),
    voidCount: sales.filter((s) => s.status === 'voided').length,
    voidMinor: sales
      .filter((s) => s.status === 'voided')
      .reduce((sum, s) => sum + s.total_minor, 0),
  };

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

  const handleImportCsv = async (csvText: string) => {
    const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
    const addedCount = Math.max(1, lines.length - 1);
    return { imported: addedCount, errors: [] };
  };

  const handleConfirmVoid = async (saleId: string, reason: string, pin?: string) => {
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

  const toggleLoadingSimulation = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div>
      {/* Top Banner & Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Supermarket Operations</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time cashier activity, price catalog and audit journals
          </p>
        </div>

        <button
          type="button"
          onClick={toggleLoadingSimulation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          title="Simulate network load to inspect real layout skeletons"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload Data
        </button>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards data={summaryData} loading={loading} />

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Catalog Products ({filteredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Sales Journal ({sales.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'products' ? (
        <ProductTable
          products={filteredProducts}
          loading={loading}
          onSearch={handleSearch}
          onAddProduct={handleAddProduct}
          onOpenImport={() => setIsImportOpen(true)}
        />
      ) : (
        <SalesTable
          sales={sales}
          loading={loading}
          onVoidClick={(sale) => setVoidingSale(sale)}
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
