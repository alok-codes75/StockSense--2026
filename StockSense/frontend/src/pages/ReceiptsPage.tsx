import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  FileText
} from 'lucide-react';
import { api } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { Pagination } from '../components/Pagination.js';
import { EmptyState, LoadingSpinner } from '../components/EmptyState.js';
import { Receipt, Product, Location } from '../types/index.js';

export const ReceiptsPage: React.FC = () => {
  const { success, error } = useNotification();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isValidateConfirmOpen, setIsValidateConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Form State
  const [supplierName, setSupplierName] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ]);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        page: page.toString(),
        limit: '15'
      });
      const res = await api.get(`/receipts?${query.toString()}`);
      if (res.data) {
        setReceipts(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      error('Failed to load receipts', err.message);
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
    fetchReceipts();
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchCatalogAndLocations();
  }, []);

  const handleOpenDetail = async (receiptId: string) => {
    try {
      const res = await api.get(`/receipts/${receiptId}`);
      if (res.data) {
        setSelectedReceipt(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const addLine = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === 'productId') {
      const prod = products.find(p => p._id === value);
      if (prod) {
        updated[index].unitPrice = prod.costPrice || 0;
      }
    }
    setLineItems(updated);
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      error('Validation', 'Supplier name is required.');
      return;
    }
    if (!destinationLocationId) {
      error('Validation', 'Please select destination receiving location.');
      return;
    }

    const validLines = lineItems.filter(l => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      error('Validation', 'Please add at least one line item with quantity > 0.');
      return;
    }

    try {
      const res = await api.post('/receipts', {
        supplierName,
        destinationLocationId,
        items: validLines,
        notes
      });
      success('Receipt Created', `Inbound receipt ${res.data.receiptNumber} created in READY status.`);
      setIsCreateOpen(false);
      setSupplierName('');
      setNotes('');
      setLineItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
      fetchReceipts();
    } catch (err: any) {
      error('Failed to create receipt', err.message);
    }
  };

  const handleValidateReceipt = async () => {
    if (!selectedReceipt) return;
    try {
      const res = await api.post(`/receipts/${selectedReceipt._id}/validate`);
      success('Receipt Validated', res.message);
      setIsValidateConfirmOpen(false);
      setIsDetailOpen(false);
      fetchReceipts();
    } catch (err: any) {
      error('Validation Failed', err.message);
    }
  };

  const handleCancelReceipt = async () => {
    if (!selectedReceipt) return;
    try {
      const res = await api.post(`/receipts/${selectedReceipt._id}/cancel`);
      success('Receipt Cancelled', res.message);
      setIsCancelConfirmOpen(false);
      setIsDetailOpen(false);
      fetchReceipts();
    } catch (err: any) {
      error('Cancellation Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inbound Purchase Receipts</h2>
          <p className="text-xs text-slate-500 mt-1">
            Receive inventory from suppliers, stage at receiving bays, and validate stock additions.
          </p>
        </div>

        <button
          onClick={() => {
            if (locations.length > 0 && !destinationLocationId) {
              setDestinationLocationId(locations[0]._id);
            }
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Inbound Receipt</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by receipt number, supplier..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Receipts</option>
            <option value="READY">Ready for Validation</option>
            <option value="DONE">Done / Stock Added</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading receipt records..." />
        ) : receipts.length === 0 ? (
          <EmptyState
            title="No Inbound Receipts Found"
            description="Create your first supplier receipt to register incoming stock into warehouse staging bays."
            actionLabel="Create Inbound Receipt"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Destination Location</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map(r => (
                  <tr
                    key={r._id}
                    onClick={() => handleOpenDetail(r._id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {r.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {r.supplierName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{r.destinationLocationName}</div>
                      <span className="text-[10px] text-slate-400">{r.warehouseName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {r.totalItemsCount || r.items.length} units
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetail(r._id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        Inspect
                      </button>
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

      {/* New Receipt Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Inbound Receipt"
        subtitle="Specify supplier, destination bin, and line item quantities"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Fasteners Ltd"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Location / Bay *</label>
              <select
                required
                value={destinationLocationId}
                onChange={e => setDestinationLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>
                    {loc.code} ({loc.name}) - {loc.warehouseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden p-3 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Inbound Line Items</span>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line Item
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
                  <div className="w-24">
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
                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Price"
                      value={line.unitPrice}
                      onChange={e => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-right"
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
            <label className="block font-semibold text-slate-700 mb-1">Notes / PO Reference</label>
            <textarea
              rows={2}
              placeholder="e.g. PO-9840, Delivery Carrier Truck #4"
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Create Inbound Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Inbound Receipt: ${selectedReceipt?.receiptNumber}`}
        subtitle={`Supplier: ${selectedReceipt?.supplierName}`}
        maxWidth="3xl"
      >
        {selectedReceipt && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Destination Location</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedReceipt.destinationLocationName}</p>
                <span className="text-[10px] text-slate-500">{selectedReceipt.warehouseName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Document Status</span>
                <div className="mt-0.5"><Badge status={selectedReceipt.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Date Created</span>
                <p className="font-bold text-slate-900 mt-0.5">{new Date(selectedReceipt.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {selectedReceipt.notes && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-slate-700">
                <span className="font-semibold text-blue-900 block mb-0.5">Order Notes:</span>
                {selectedReceipt.notes}
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Line Items Breakdown</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Inbound Qty</th>
                      <th className="py-2.5 px-3 text-right">Total ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReceipt.items.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{it.productSku}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center">${Number(it.unitPrice).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">+{it.quantity} {it.unitOfMeasure}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">${(it.quantity * it.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {selectedReceipt.status === 'READY' ? (
                <>
                  <button
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold border border-rose-200"
                  >
                    Cancel Receipt
                  </button>

                  <button
                    onClick={() => setIsValidateConfirmOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Validate Receipt & Increase Stock</span>
                  </button>
                </>
              ) : (
                <div className="w-full text-right text-xs text-slate-500 italic">
                  This document has already been processed on {selectedReceipt.validatedAt ? new Date(selectedReceipt.validatedAt).toLocaleString() : 'N/A'}.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Validate Confirmation */}
      <ConfirmDialog
        isOpen={isValidateConfirmOpen}
        onClose={() => setIsValidateConfirmOpen(false)}
        onConfirm={handleValidateReceipt}
        title="Validate Inbound Receipt"
        message={`Confirm physical receipt of goods for ${selectedReceipt?.receiptNumber}? This will immediately increase stock on hand at ${selectedReceipt?.destinationLocationName} and generate auditable Stock Ledger entries.`}
        confirmLabel="Validate & Add to Stock"
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelReceipt}
        title="Cancel Inbound Receipt"
        message={`Are you sure you want to cancel receipt ${selectedReceipt?.receiptNumber}? No inventory balances will be modified.`}
        confirmLabel="Cancel Receipt"
        isDestructive
      />
    </div>
  );
};
