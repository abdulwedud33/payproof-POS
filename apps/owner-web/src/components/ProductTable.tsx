import React, { useState } from 'react';
import type { ProductResponse } from '@payproof/shared-types';
import { formatBirr } from '@payproof/money';
import { Search, Plus, Upload, Tag } from 'lucide-react';
import { TableSkeleton } from './Skeleton';

export interface ProductTableProps {
  products: ProductResponse[];
  loading: boolean;
  onSearch: (term: string) => void;
  onAddProduct: () => void;
  onOpenImport: () => void;
}

export function ProductTable({
  products,
  loading,
  onSearch,
  onAddProduct,
  onOpenImport,
}: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value);
  };

  if (loading) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Table Action Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, local name or barcode..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={onAddProduct}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Table Data */}
      {products.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-800">No products found</h4>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No catalog items matched "${searchTerm}". Try a different keyword.`
              : 'Your store catalog is empty. Add your first item or import a spreadsheet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Local Name</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Barcodes</th>
                <th className="py-3 px-4 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {p.name}
                    {p.sku && <span className="block text-xs text-slate-400 mt-0.5">{p.sku}</span>}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {p.name_local || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                      {p.unit}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.barcodes && p.barcodes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.barcodes.map((b) => (
                          <span
                            key={b}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200/50"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                    {formatBirr(p.price_minor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
