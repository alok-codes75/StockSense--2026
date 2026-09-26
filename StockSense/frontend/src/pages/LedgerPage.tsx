import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Download,
  Filter,
  RefreshCw,
  Building2,
  Calendar
} from 'lucide-react';
import { api } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';
import { Badge } from '../components/Badge.js';
import { Pagination } from '../components/Pagination.js';
import { EmptyState, LoadingSpinner } from '../components/EmptyState.js';
import { StockLedgerEntry } from '../types/index.js';

export const LedgerPage: React.FC = () => {
  const { success, error } = useNotification();

  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        movementType,
        startDate,
        endDate,
        page: page.toString(),
        limit: '25'
      });
      const res = await api.get(`/ledger?${query.toString()}`);
      if (res.data) {
        setLedgerEntries(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      error('Failed to load ledger', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [search, movementType, startDate, endDate, page]);

  const handleExportCSV = () => {
    if (ledgerEntries.length === 0) return;
    const headers = ['Timestamp', 'Movement Type', 'Reference Number', 'SKU', 'Product Name', 'Location', 'Quantity Change', 'Balance After', 'Reason', 'Performed By'];
    const rows = ledgerEntries.map(e => [
      `"${new Date(e.createdAt).toISOString()}"`,
      `"${e.movementType}"`,
      `"${e.referenceNumber}"`,
      `"${e.sku}"`,
      `"${e.productName.replace(/"/g, '""')}"`,
      `"${e.locationName}"`,
      e.quantityChange,
      e.balanceAfter,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${e.performedByName}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stocksense_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Export Complete', 'Stock ledger records downloaded as CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Immutable Stock Ledger & Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic audit trail of all receipts, deliveries, transfers, and cycle count adjustments.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={ledgerEntries.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Ledger (CSV)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference #, SKU, reason, user..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Movement Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500">Type:</span>
            <select
              value={movementType}
              onChange={e => {
                setMovementType(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Movement Types</option>
              <option value="RECEIPT">Inbound Receipts (+ In)</option>
              <option value="DELIVERY">Outbound Deliveries (- Out)</option>
              <option value="INTERNAL_TRANSFER_OUT">Transfer Out (- Out)</option>
              <option value="INTERNAL_TRANSFER_IN">Transfer In (+ In)</option>
              <option value="INVENTORY_ADJUSTMENT">Cycle Adjustments</option>
              <option value="INITIAL_BALANCE">Initial Baseline Load</option>
            </select>
          </div>

          <button
            onClick={fetchLedger}
            title="Refresh Ledger"
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Querying immutable stock movements..." />
        ) : ledgerEntries.length === 0 ? (
          <EmptyState
            title="No Ledger Records Found"
            description="No inventory transactions matched your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Change</th>
                  <th className="py-3 px-4 text-center">Balance After</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.map(e => (
                  <tr key={e._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                      <div>{new Date(e.createdAt).toLocaleDateString()}</div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={e.movementType} />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {e.referenceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{e.productName}</div>
                      <span className="text-[11px] font-mono text-slate-400">{e.sku}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {e.locationName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span
                        className={
                          e.quantityChange > 0
                            ? 'text-emerald-600'
                            : e.quantityChange < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }
                      >
                        {e.quantityChange > 0 ? `+${e.quantityChange}` : e.quantityChange}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {e.balanceAfter}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={e.reason}>
                      {e.reason || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700 font-medium whitespace-nowrap">
                      {e.performedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={25}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
