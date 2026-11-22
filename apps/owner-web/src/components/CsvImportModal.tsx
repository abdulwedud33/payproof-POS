import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (csvContent: string) => Promise<{ imported: number; errors: any[] }>;
}

export function CsvImportModal({ isOpen, onClose, onImport }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState(
    `name,name_local,sku,unit,price_minor,barcode\nMagna Teff 1kg,የማግና ጤፍ,TEF-01,kg,12500,690100100001\nShola Milk 500ml,ሾላ ወተት,MLK-01,piece,6000,690100100040`
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: any[] } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onImport(csvText);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-sm">Bulk Import Products (CSV)</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Security Alert: Formula Injection */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">Security Protected:</span> Cells starting with formula
              operators (<code className="font-mono bg-amber-100 px-1 rounded">= + - @</code>) are
              automatically sanitized to prevent spreadsheet formula injection. Prices are verified
              strictly as non-negative integer santim.
            </div>
          </div>

          <label className="block text-xs font-semibold text-slate-700 mb-1">
            CSV Content (Header required:{' '}
            <code className="font-mono text-slate-600">
              name,name_local,sku,unit,price_minor,barcode
            </code>
            )
          </label>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 font-mono text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          />

          {result && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Successfully imported <strong>{result.imported}</strong> products into catalog.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !csvText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? 'Importing...' : 'Upload & Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
