import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Layers,
  AlertTriangle,
  PackageCheck,
  Truck,
  ArrowLeftRight,
  TrendingDown,
  Building2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { StatCard } from '../components/StatCard.js';
import { Badge } from '../components/Badge.js';
import { LoadingSpinner } from '../components/EmptyState.js';
import { api } from '../services/api.js';
import { DashboardKPIs, LowStockAlert, StockLedgerEntry } from '../types/index.js';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [movements, setMovements] = useState<StockLedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedWarehouse !== 'ALL') query.append('warehouseId', selectedWarehouse);
      if (selectedCategory !== 'ALL') query.append('category', selectedCategory);

      const [summaryRes, whRes, prodRes] = await Promise.all([
        api.get(`/dashboard/summary?${query.toString()}`),
        api.get('/warehouses'),
        api.get('/products?limit=1')
      ]);

      if (summaryRes.data) {
        setKpis(summaryRes.data.kpis);
        setAlerts(summaryRes.data.lowStockAlerts || []);
        setMovements(summaryRes.data.recentMovements || []);
      }
      if (whRes.data) {
        setWarehouses(whRes.data);
      }
      if (prodRes.categories) {
        setCategories(prodRes.categories);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedWarehouse, selectedCategory]);

  if (isLoading && !kpis) {
    return <LoadingSpinner message="Calculating real-time inventory metrics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inventory Operations Center</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status across all active fulfillment facilities and storage bins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 hover:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Warehouses (Global)</option>
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 hover:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            title="Refresh metrics"
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Distinct SKUs"
          value={kpis?.distinctProducts || 0}
          subtitle="Catalog catalog active items"
          icon={<Boxes className="w-5 h-5" />}
          accentColor="indigo"
          onClick={() => navigate('/products')}
        />

        <StatCard
          title="Stock on Hand (Units)"
          value={kpis?.totalStockQuantity?.toLocaleString() || 0}
          subtitle="Physical units in bins"
          icon={<Layers className="w-5 h-5" />}
          accentColor="blue"
          onClick={() => navigate('/products')}
        />

        <StatCard
          title="Low & Critical Stock"
          value={(kpis?.lowStockCount || 0) + (kpis?.outOfStockCount || 0)}
          subtitle={`${kpis?.outOfStockCount || 0} out of stock, ${kpis?.lowStockCount || 0} reorder threshold`}
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="amber"
          trend={{
            label: `${kpis?.lowStockCount || 0} below safety threshold`,
            isWarning: true
          }}
          onClick={() => navigate('/alerts')}
        />

        <StatCard
          title="Pending Inbound Receipts"
          value={kpis?.pendingReceiptsCount || 0}
          subtitle="Awaiting dock validation"
          icon={<PackageCheck className="w-5 h-5" />}
          accentColor="emerald"
          onClick={() => navigate('/receipts')}
        />
      </div>

      {/* Operational Pipeline KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/deliveries')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Pending Deliveries</p>
              <p className="text-xl font-bold text-slate-900">{kpis?.pendingDeliveriesCount || 0} orders</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-600">View &rarr;</span>
        </div>

        <div
          onClick={() => navigate('/transfers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Scheduled Transfers</p>
              <p className="text-xl font-bold text-slate-900">{kpis?.scheduledTransfersCount || 0} movements</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-600">View &rarr;</span>
        </div>

        <div
          onClick={() => navigate('/ledger')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Audit Ledger Records</p>
              <p className="text-xl font-bold text-slate-900">{kpis?.totalLedgerMovements || 0} entries</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-600">View &rarr;</span>
        </div>
      </div>

      {/* Two Column Section: Low Stock Warnings & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Watchlist */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Critical & Low Stock Items
              </h3>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              See all ({alerts.length})
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {alerts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                All inventory levels exceed reorder thresholds.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <th className="py-2.5 px-4 font-semibold">SKU / Product</th>
                    <th className="py-2.5 px-4 font-semibold text-center">On Hand</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Threshold</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map(item => (
                    <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 truncate max-w-[220px]">{item.name}</p>
                        <span className="text-[11px] text-slate-500 font-mono">{item.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={item.currentStock === 0 ? 'text-rose-600' : 'text-amber-700'}>
                          {item.currentStock} {item.unitOfMeasure}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {item.reorderThreshold} {item.unitOfMeasure}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live Stock Ledger Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Live Stock Movement Stream
              </h3>
            </div>
            <button
              onClick={() => navigate('/ledger')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Full Ledger &rarr;
            </button>
          </div>

          <div className="flex-1 overflow-x-auto divide-y divide-slate-100">
            {movements.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No recorded stock transactions yet.
              </div>
            ) : (
              movements.map(m => (
                <div key={m._id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge status={m.movementType} />
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        {m.referenceNumber}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{m.productName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{m.locationName}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold ${
                        m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Balance: {m.balanceAfter}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
