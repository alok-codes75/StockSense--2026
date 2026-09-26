import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  MapPin
} from 'lucide-react';
import { api } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { Pagination } from '../components/Pagination.js';
import { EmptyState, LoadingSpinner } from '../components/EmptyState.js';
import { Delivery, Product, Location } from '../types/index.js';

export const DeliveriesPage: React.FC = () => {
  const { success, error } = useNotification();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [isValidateConfirmOpen, setIsValidateConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 }
  ]);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        page: page.toString(),
        limit: '15'
      });
      const res = await api.get(`/deliveries?${query.toString()}`);
      if (res.data) {
        setDeliveries(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      error('Failed to load deliveries', err.message);
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
    fetchDeliveries();
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchCatalogAndLocations();
  }, []);

  const handleOpenDetail = async (deliveryId: string) => {
    try {
      const res = await api.get(`/deliveries/${deliveryId}`);
      if (res.data) {
        setSelectedDelivery(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const addLine = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1 }]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      error('Validation', 'Customer name is required.');
      return;
    }
    if (!sourceLocationId) {
      error('Validation', 'Please select source picking location.');
      return;
    }

    const validLines = lineItems.filter(l => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      error('Validation', 'Please add at least one line item with quantity > 0.');
      return;
    }

    try {
      const res = await api.post('/deliveries', {
        customerName,
        sourceLocationId,
        items: validLines,
        shippingAddress,
        trackingNumber,
        notes
      });
      success('Delivery Created', `Outbound delivery ${res.data.deliveryNumber} created in READY status.`);
      setIsCreateOpen(false);
      setCustomerName('');
      setShippingAddress('');
      setTrackingNumber('');
      setNotes('');
      setLineItems([{ productId: '', quantity: 1 }]);
      fetchDeliveries();
    } catch (err: any) {
      error('Creation Failed', err.message);
    }
  };

  const handleValidateDelivery = async () => {
    if (!selectedDelivery) return;
    try {
      const res = await api.post(`/deliveries/${selectedDelivery._id}/validate`);
      success('Fulfillment Complete', res.message);
      setIsValidateConfirmOpen(false);
      setIsDetailOpen(false);
      fetchDeliveries();
    } catch (err: any) {
      error('Cannot Dispatch Delivery', err.message);
    }
  };

  const handleCancelDelivery = async () => {
    if (!selectedDelivery) return;
    try {
      const res = await api.post(`/deliveries/${selectedDelivery._id}/cancel`);
      success('Delivery Cancelled', res.message);
      setIsCancelConfirmOpen(false);
      setIsDetailOpen(false);
      fetchDeliveries();
    } catch (err: any) {
      error('Cancellation Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Outbound Delivery Orders</h2>
          <p className="text-xs text-slate-500 mt-1">
            Pick, pack, and validate customer order dispatches with automatic stock deduction.
          </p>
        </div>

        <button
          onClick={() => {
            if (locations.length > 0 && !sourceLocationId) {
              setSourceLocationId(locations[0]._id);
            }
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery Order</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, customer..."
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
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="ALL">All Delivery Orders</option>
            <option value="READY">Ready for Dispatch</option>
            <option value="DONE">Done / Shipped</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading delivery orders..." />
        ) : deliveries.length === 0 ? (
          <EmptyState
            title="No Delivery Orders Found"
            description="Create an outbound delivery order to fulfill customer requests from designated warehouse bins."
            actionLabel="Create Delivery Order"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Source Location</th>
                  <th className="py-3 px-4 text-center">Lines</th>
                  <th className="py-3 px-4 text-center">Stock Feasibility</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map(d => (
                  <tr
                    key={d._id}
                    onClick={() => handleOpenDetail(d._id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {d.deliveryNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {d.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{d.sourceLocationName}</div>
                      <span className="text-[10px] text-slate-400">{d.warehouseName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {d.totalItemsCount || d.items.length} units
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {d.status === 'DONE' ? (
                        <span className="text-emerald-600 font-medium">Shipped</span>
                      ) : d.hasSufficientStock ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                          Stock Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200">
                          Insufficient Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={d.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetail(d._id)}
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

      {/* Create Delivery Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Outbound Delivery Order"
        subtitle="Set up customer shipment and reserve items for picking"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateDelivery} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Manufacturing Corp"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Source Picking Location *</label>
              <select
                required
                value={sourceLocationId}
                onChange={e => setSourceLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>
                    {loc.code} ({loc.name}) - {loc.warehouseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shipping Address</label>
              <input
                type="text"
                placeholder="Street address, city, state, zip"
                value={shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tracking Number</label>
              <input
                type="text"
                placeholder="e.g. TRK-FDX-998231"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden p-3 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Fulfillment Line Items</span>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
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
            <label className="block font-semibold text-slate-700 mb-1">Order Notes</label>
            <textarea
              rows={2}
              placeholder="Packaging requirements, delivery dock hours..."
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Create Delivery Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Delivery Inspection Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Delivery Order: ${selectedDelivery?.deliveryNumber}`}
        subtitle={`Customer: ${selectedDelivery?.customerName}`}
        maxWidth="3xl"
      >
        {selectedDelivery && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Picking Source Location</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDelivery.sourceLocationName}</p>
                <span className="text-[10px] text-slate-500">{selectedDelivery.warehouseName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Status</span>
                <div className="mt-0.5"><Badge status={selectedDelivery.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Tracking #</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {selectedDelivery.trackingNumber || 'Pending Courier'}
                </p>
              </div>
            </div>

            {selectedDelivery.shippingAddress && (
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span><strong>Destination Address:</strong> {selectedDelivery.shippingAddress}</span>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Requested Items & Stock Sufficiency Check</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Required Qty</th>
                      <th className="py-2.5 px-3 text-center">Available in Bin</th>
                      <th className="py-2.5 px-3 text-right">Feasibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDelivery.items.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{it.productSku}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{it.quantity} {it.unitOfMeasure}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                          {selectedDelivery.status === 'DONE' ? 'Dispatched' : `${it.availableAtSource} units`}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {selectedDelivery.status === 'DONE' ? (
                            <span className="text-emerald-600 font-medium">Fulfilled</span>
                          ) : it.canFulfill ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                              Available
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-200">
                              Shortage
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {selectedDelivery.status === 'READY' ? (
                <>
                  <button
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold border border-rose-200"
                  >
                    Cancel Order
                  </button>

                  <button
                    onClick={() => setIsValidateConfirmOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Validate & Dispatch Order</span>
                  </button>
                </>
              ) : (
                <div className="w-full text-right text-xs text-slate-500 italic">
                  Shipped on {selectedDelivery.validatedAt ? new Date(selectedDelivery.validatedAt).toLocaleString() : 'N/A'}.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Validate & Dispatch Confirmation */}
      <ConfirmDialog
        isOpen={isValidateConfirmOpen}
        onClose={() => setIsValidateConfirmOpen(false)}
        onConfirm={handleValidateDelivery}
        title="Validate & Ship Delivery Order"
        message={`Confirm dispatch for ${selectedDelivery?.deliveryNumber}? This will deduct inventory from ${selectedDelivery?.sourceLocationName} and generate auditable Stock Ledger records. If stock is insufficient, transaction will safely abort.`}
        confirmLabel="Confirm & Dispatch"
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelDelivery}
        title="Cancel Delivery Order"
        message={`Are you sure you want to cancel ${selectedDelivery?.deliveryNumber}? No inventory balances will be modified.`}
        confirmLabel="Cancel Delivery"
        isDestructive
      />
    </div>
  );
};
