import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Search,
  Plus,
  Trash2,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { Pagination } from '../components/Pagination.js';
import { EmptyState, LoadingSpinner } from '../components/EmptyState.js';
import { Transfer, Product, Location } from '../types/index.js';

export const TransfersPage: React.FC = () => {
  const { success, error } = useNotification();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);

  // Form State
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [reason, setReason] = useState('');
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 }
  ]);

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        page: page.toString(),
        limit: '15'
      });
      const res = await api.get(`/transfers?${query.toString()}`);
      if (res.data) {
        setTransfers(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      error('Failed to load transfers', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogAndLocations = async () => {
    try {
      const [prodRes, locRes] = await Promise.all([
        api.get('/products?limit=100'),
        api.get('/warehouses/locations')
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (locRes.data) setLocations(locRes.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchTransfers();
  }, [search, page]);

  useEffect(() => {
    fetchCatalogAndLocations();
  }, []);

  const addLine = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1 }]);
  };

  const removeLine = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    setLineItems(updated);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocationId || !destinationLocationId) {
      error('Validation', 'Please select both source and destination locations.');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      error('Validation', 'Source and destination locations must be different.');
      return;
    }

    const validLines = lineItems.filter(l => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      error('Validation', 'Please add at least one product with quantity > 0.');
      return;
    }

    try {
      const res = await api.post('/transfers', {
        sourceLocationId,
        destinationLocationId,
        items: validLines,
        reason
      });
      success('Transfer Completed', `Stock transfer ${res.data.transferNumber} executed successfully.`);
      setIsCreateOpen(false);
      setReason('');
      setLineItems([{ productId: '', quantity: 1 }]);
      fetchTransfers();
    } catch (err: any) {
      error('Transfer Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Internal Stock Transfers</h2>
          <p className="text-xs text-slate-500 mt-1">
            Reallocate inventory between storage zones, pick bays, and distribution facilities.
          </p>
        </div>

        <button
          onClick={() => {
            if (locations.length >= 2) {
              setSourceLocationId(locations[0]._id);
              setDestinationLocationId(locations[1]._id);
            }
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transfers by number, reason..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
          />
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading transfer records..." />
        ) : transfers.length === 0 ? (
          <EmptyState
            title="No Transfers Found"
            description="Move stock between warehouse locations, bulk storage racks, and pick bins."
            actionLabel="Create Internal Transfer"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Source Location</th>
                  <th className="py-3 px-4">Destination Location</th>
                  <th className="py-3 px-4">Items / Qty</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map(t => (
                  <tr
                    key={t._id}
                    onClick={() => {
                      setSelectedTransfer(t);
                      setIsDetailOpen(true);
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {t.transferNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {t.sourceLocationName}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {t.destinationLocationName}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.items.map((it: any, i: number) => (
                        <div key={i} className="text-slate-800 font-medium">
                          {it.productSku || it.productName}: <strong>{it.quantity} units</strong>
                        </div>
                      ))}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {t.reason || 'Warehouse replenishment'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                      {new Date(t.createdAt).toLocaleDateString()}
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
          limit={15}
          onPageChange={setPage}
        />
      </div>

      {/* New Transfer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Execute Internal Stock Transfer"
        subtitle="Deduct inventory from origin bin and credit destination bin in a single atomic transaction"
        maxWidth="2xl"
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Source Location (From) *</label>
              <select
                required
                value={sourceLocationId}
                onChange={e => setSourceLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select origin location...</option>
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>
                    {loc.code} ({loc.name}) - {loc.warehouseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Location (To) *</label>
              <select
                required
                value={destinationLocationId}
                onChange={e => setDestinationLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select destination location...</option>
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>
                    {loc.code} ({loc.name}) - {loc.warehouseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden p-3 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Transfer Products & Quantities</span>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <select
                      required
                      value={line.productId}
                      onChange={e => updateLine(idx, 'productId', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Select Catalog Product...</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.sku} - {p.name} ({p.unitOfMeasure})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={e => updateLine(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lineItems.length === 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transfer Purpose / Reason</label>
            <input
              type="text"
              placeholder="e.g. Replenishing pick bin from bulk reserve, seasonal rebalancing"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Execute Stock Transfer
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Inspection Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Transfer Record: ${selectedTransfer?.transferNumber}`}
        subtitle={`Completed on ${selectedTransfer?.createdAt ? new Date(selectedTransfer.createdAt).toLocaleString() : ''}`}
        maxWidth="lg"
      >
        {selectedTransfer && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Origin Location:</span>
                <span className="font-bold text-slate-900">{selectedTransfer.sourceLocationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Destination Location:</span>
                <span className="font-bold text-slate-900">{selectedTransfer.destinationLocationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Audit Reason:</span>
                <span className="text-slate-700">{selectedTransfer.reason || 'None provided'}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Transferred Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Item / SKU</th>
                      <th className="py-2 px-3 text-right">Units Moved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTransfer.items.map((it: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {it.productSku || it.productName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-600">
                          {it.quantity} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
