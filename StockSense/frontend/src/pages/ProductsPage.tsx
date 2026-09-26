import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Archive,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { Pagination } from '../components/Pagination.js';
import { EmptyState, LoadingSpinner } from '../components/EmptyState.js';
import { Product } from '../types/index.js';

export const ProductsPage: React.FC = () => {
  const { isManager } = useAuth();
  const { success, error } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unitOfMeasure: 'UNIT',
    costPrice: '',
    sellingPrice: '',
    reorderThreshold: '20',
    initialStock: '',
    initialLocationId: ''
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        category: selectedCategory,
        stockStatus: selectedStockStatus,
        page: page.toString(),
        limit: '15'
      });

      const res = await api.get(`/products?${query.toString()}`);
      if (res.data) {
        setProducts(res.data);
        setCategories(res.categories || []);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      error('Failed to load products', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/warehouses/locations');
      if (res.data) setLocations(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchLocations();
  }, [search, selectedCategory, selectedStockStatus, page]);

  const handleOpenDetail = async (productId: string) => {
    try {
      const res = await api.get(`/products/${productId}`);
      if (res.data) {
        setSelectedProduct(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unitOfMeasure: formData.unitOfMeasure,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        reorderThreshold: Number(formData.reorderThreshold) || 0,
        initialStock: formData.initialStock ? Number(formData.initialStock) : undefined,
        initialLocationId: formData.initialLocationId || undefined
      };

      await api.post('/products', payload);
      success('Product Catalog Updated', `SKU ${payload.sku} created successfully.`);
      setIsCreateOpen(false);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: '',
        unitOfMeasure: 'UNIT',
        costPrice: '',
        sellingPrice: '',
        reorderThreshold: '20',
        initialStock: '',
        initialLocationId: ''
      });
      fetchProducts();
    } catch (err: any) {
      error('Cannot Create Product', err.message);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await api.put(`/products/${selectedProduct._id}`, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unitOfMeasure: formData.unitOfMeasure,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        reorderThreshold: Number(formData.reorderThreshold)
      });
      success('Success', `Product ${selectedProduct.sku} updated.`);
      setIsEditOpen(false);
      fetchProducts();
    } catch (err: any) {
      error('Update Failed', err.message);
    }
  };

  const handleArchive = async () => {
    if (!selectedProduct) return;
    try {
      await api.post(`/products/${selectedProduct._id}/archive`);
      success('Product Archived', `SKU ${selectedProduct.sku} moved to archive. Historical records preserved.`);
      setIsArchiveConfirmOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      error('Archive Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Product Catalog & Master SKUs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain master items, units of measure, safety reorder thresholds, and bin allocations.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by SKU, product name..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500">Stock Status:</span>
            <select
              value={selectedStockStatus}
              onChange={e => {
                setSelectedStockStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Inventory Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock (At/Below Threshold)</option>
              <option value="OUT_OF_STOCK">Out of Stock (Zero)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading catalog records..." />
        ) : products.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description="No inventory products matched your active filter or search query."
            actionLabel={isManager ? "Create First Product" : undefined}
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name & Category</th>
                  <th className="py-3 px-4 text-center">UOM</th>
                  <th className="py-3 px-4 text-right">Physical Stock</th>
                  <th className="py-3 px-4 text-right">Reorder Threshold</th>
                  <th className="py-3 px-4 text-center">Stock Health</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => {
                  const onHand = p.stock?.onHand ?? 0;
                  return (
                    <tr
                      key={p._id}
                      onClick={() => handleOpenDetail(p._id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.sku}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <span className="text-[11px] text-slate-400">{p.category}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        {p.unitOfMeasure}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span className={onHand === 0 ? 'text-rose-600' : onHand <= p.reorderThreshold ? 'text-amber-600' : 'text-slate-900'}>
                          {onHand.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                        {p.reorderThreshold}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge status={p.statusLabel || 'IN_STOCK'} />
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(p._id)}
                            title="View Locations Breakdown & Ledger"
                            className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isManager && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setFormData({
                                    sku: p.sku,
                                    name: p.name,
                                    description: p.description,
                                    category: p.category,
                                    unitOfMeasure: p.unitOfMeasure,
                                    costPrice: p.costPrice.toString(),
                                    sellingPrice: p.sellingPrice.toString(),
                                    reorderThreshold: p.reorderThreshold.toString(),
                                    initialStock: '',
                                    initialLocationId: ''
                                  });
                                  setIsEditOpen(true);
                                }}
                                title="Edit Product"
                                className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setIsArchiveConfirmOpen(true);
                                }}
                                title="Archive Product"
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-slate-100"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Product SKU"
        subtitle="Register an inventory item with unique SKU and safety reorder parameters"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unique SKU *</label>
              <input
                type="text"
                required
                placeholder="e.g. SKU-STL-9000"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                placeholder="Item designation"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category *</label>
              <input
                type="text"
                required
                placeholder="e.g. Hardware, Electrical"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit of Measure (UOM) *</label>
              <select
                value={formData.unitOfMeasure}
                onChange={e => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="UNIT">UNIT</option>
                <option value="BOX">BOX</option>
                <option value="EACH">EACH</option>
                <option value="KG">KG</option>
                <option value="METER">METER</option>
                <option value="ROLL">ROLL</option>
                <option value="KIT">KIT</option>
                <option value="PAIL">PAIL</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reorder Threshold *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorderThreshold}
                onChange={e => setFormData({ ...formData, reorderThreshold: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selling Price ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Technical specifications, storage notes, or manufacturer details..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Optional Initial Stock Setup */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 block text-xs">
              Optional Initial Baseline Stock
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Initial Quantity</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.initialStock}
                  onChange={e => setFormData({ ...formData, initialStock: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Assign to Location</label>
                <select
                  value={formData.initialLocationId}
                  onChange={e => setFormData({ ...formData, initialLocationId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Select Location...</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>
                      {loc.code} ({loc.name}) - {loc.warehouseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
              Save Product SKU
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Product: ${formData.sku}`}
        maxWidth="xl"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reorder Threshold</label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorderThreshold}
                onChange={e => setFormData({ ...formData, reorderThreshold: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selling Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
            >
              Update Details
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Detail Drawer/Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedProduct?.name || 'Product Details'}
        subtitle={`SKU: ${selectedProduct?.sku} | Category: ${selectedProduct?.category}`}
        maxWidth="3xl"
      >
        {selectedProduct && (
          <div className="space-y-6 text-xs">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Total on Hand</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedProduct.stock?.onHand ?? 0} {selectedProduct.unitOfMeasure}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Reorder Minimum</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedProduct.reorderThreshold} {selectedProduct.unitOfMeasure}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Unit Valuation</span>
                <p className="text-xl font-bold text-indigo-600 mt-0.5">
                  ${selectedProduct.costPrice.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Warehouse & Location Breakdown */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                Physical Stock by Warehouse & Location
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Warehouse</th>
                      <th className="py-2.5 px-3">Location Code</th>
                      <th className="py-2.5 px-3 text-right">Quantity on Hand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedProduct.locations && selectedProduct.locations.length > 0 ? (
                      selectedProduct.locations.map((loc: any) => (
                        <tr key={loc.balanceId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{loc.warehouseName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{loc.locationCode} - {loc.locationName}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{loc.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400">
                          No stock allocated to any location yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Product Movement History */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
                Recent Product Stock Ledger Timeline
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {selectedProduct.recentMovements && selectedProduct.recentMovements.length > 0 ? (
                  selectedProduct.recentMovements.map((m: any) => (
                    <div key={m._id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge status={m.movementType} />
                          <span className="font-mono text-[11px] font-semibold text-slate-600">{m.referenceNumber}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{m.locationName} | {m.reason || 'Routine'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400">No ledger history for this product yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={handleArchive}
        title="Archive Product"
        message={`Are you sure you want to archive SKU "${selectedProduct?.sku}"? The product will be hidden from new purchase receipts, but all historical stock balances and ledger audit movements remain permanently preserved.`}
        confirmLabel="Archive SKU"
        isDestructive
      />
    </div>
  );
};
