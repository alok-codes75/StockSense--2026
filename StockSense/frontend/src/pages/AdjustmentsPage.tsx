import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Search,
  Plus,
  AlertTriangle,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Modal } from '../components/Modal.js';
import { Pagination } from '../components/Pagination.js';
import { EmptyState, LoadingSpinner } from '../components/EmptyState.js';
import { Adjustment, Product, Location } from '../types/index.js';

export const AdjustmentsPage: React.FC = () => {
  const { isManager } = useAuth();
  const { success, error } = useNotification();

  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Search
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal & Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [systemQuantity, setSystemQuantity] = useState<number | null>(null);
  const [countedQuantity, setCountedQuantity] = useState('');
  const [reason, setReason] = useState('');

  const fetchAdjustments = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        page: page.toString(),
        limit: '15'
      });
      const res = await api.get(`/adjustments?${query.toString()}`);
      if (res.data) {
        setAdjustments(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      error('Failed to load adjustments', err.message);
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
    fetchAdjustments();
  }, [search, page]);

  useEffect(() => {
    fetchCatalogAndLocations();
  }, []);

  // When product or location is selected in modal, fetch current system quantity
  useEffect(() => {
    if (selectedProductId && selectedLocationId) {
      api.get(`/products/${selectedProductId}`)
        .then(res => {
          if (res.data && res.data.locations) {
            const locBalance = res.data.locations.find((l: any) => l.locationId === selectedLocationId);
            setSystemQuantity(locBalance ? locBalance.quantity : 0);
          } else {
            setSystemQuantity(0);
          }
        })
        .catch(() => setSystemQuantity(0));
    } else {
      setSystemQuantity(null);
    }
  }, [selectedProductId, selectedLocationId]);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedLocationId || countedQuantity === '' || !reason.trim()) {
      error('Validation', 'Product, location, physical counted quantity, and audit reason are required.');
      return;
    }

    try {
      const res = await api.post('/adjustments', {
        productId: selectedProductId,
        locationId: selectedLocationId,
        countedQuantity: Number(countedQuantity),
        reason
      });
      success('Adjustment Saved', res.message);
      setIsCreateOpen(false);
      setSelectedProductId('');
      setSelectedLocationId('');
      setCountedQuantity('');
      setReason('');
      setSystemQuantity(null);
      fetchAdjustments();
    } catch (err: any) {
      error('Adjustment Error', err.message);
    }
  };

  const calculatedDifference =
    systemQuantity !== null && countedQuantity !== ''
      ? Number(countedQuantity) - systemQuantity
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inventory Cycle Count Adjustments</h2>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile physical stock counts with system book balances under auditable manager authorization.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Stock Adjustment</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search adjustments by SKU, reason..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
          />
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading adjustment logs..." />
        ) : adjustments.length === 0 ? (
          <EmptyState
            title="No Adjustments Recorded"
            description="Cycle count reconciliations and inventory variance adjustments will appear here."
            actionLabel={isManager ? "Record New Adjustment" : undefined}
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Adjustment #</th>
                  <th className="py-3 px-4">SKU / Product</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">System Book Qty</th>
                  <th className="py-3 px-4 text-center">Physical Count</th>
                  <th className="py-3 px-4 text-center">Variance (Diff)</th>
                  <th className="py-3 px-4">Audit Reason</th>
                  <th className="py-3 px-4 text-right">Authorized By</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map(a => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {a.adjustmentNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{a.productName}</div>
                      <span className="text-[11px] font-mono text-slate-400">{a.productSku}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {a.locationCode} - {a.locationName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                      {a.systemQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {a.countedQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          a.difference > 0
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : a.difference < 0
                            ? 'text-rose-700 bg-rose-50 border border-rose-200'
                            : 'text-slate-600 bg-slate-100'
                        }`}
                      >
                        {a.difference > 0 ? `+${a.difference}` : a.difference}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {a.reason}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                      {a.validatedByName || 'Manager'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                      {new Date(a.createdAt).toLocaleDateString()}
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

      {/* Record Adjustment Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Inventory Cycle Count Adjustment"
        subtitle="Specify product, location, counted units, and mandatory audit reason"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product *</label>
            <select
              required
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Catalog Product...</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Location *</label>
            <select
              required
              value={selectedLocationId}
              onChange={e => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Storage Location...</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>
                  {loc.code} ({loc.name}) - {loc.warehouseName}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Comparison Card */}
          {systemQuantity !== null && (
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">System Book Qty</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{systemQuantity}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Physical Count</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={countedQuantity}
                  onChange={e => setCountedQuantity(e.target.value)}
                  className="w-full px-2 py-1 mt-1 border border-slate-300 rounded-lg text-center font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Calculated Variance</span>
                <p
                  className={`text-xl font-bold mt-0.5 ${
                    calculatedDifference === null
                      ? 'text-slate-400'
                      : calculatedDifference > 0
                      ? 'text-emerald-600'
                      : calculatedDifference < 0
                      ? 'text-rose-600'
                      : 'text-slate-700'
                  }`}
                >
                  {calculatedDifference === null
                    ? '-'
                    : calculatedDifference > 0
                    ? `+${calculatedDifference}`
                    : calculatedDifference}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Audit Justification / Variance Reason *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. End of Month cycle count variance, damaged box found, miscounted packaging"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              Save Adjustment & Update Ledger
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
