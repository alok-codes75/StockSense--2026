import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  PackageOpen,
  ArrowRight,
  Plus,
  RefreshCw,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.js';
import { LoadingSpinner } from '../components/EmptyState.js';
import { LowStockAlert } from '../types/index.js';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/dashboard/alerts');
      if (res.data) setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const outOfStockItems = alerts.filter(a => a.status === 'OUT_OF_STOCK');
  const lowStockItems = alerts.filter(a => a.status === 'LOW_STOCK');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Safety Stock & Replenishment Monitor</h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated alerts tracking SKUs operating at or below defined warehouse safety thresholds.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock Checks</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Out of Stock (Zero Units)</span>
            <p className="text-2xl font-bold text-rose-950 mt-1">{outOfStockItems.length} SKUs</p>
          </div>
          <div className="p-3 bg-rose-100 rounded-lg text-rose-700">
            <PackageOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Below Safety Threshold</span>
            <p className="text-2xl font-bold text-amber-950 mt-1">{lowStockItems.length} SKUs</p>
          </div>
          <div className="p-3 bg-amber-100 rounded-lg text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Replenishment Action</span>
            <p className="text-xs text-emerald-900 mt-1 font-medium leading-relaxed">
              Generate supplier receipts to restore safety stock buffers.
            </p>
          </div>
          <button
            onClick={() => navigate('/receipts')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs whitespace-nowrap"
          >
            Open Receipts &rarr;
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Calculating stock threshold levels..." />
        ) : alerts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">All Stock Healthy</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No inventory products are currently below their minimum safety reorder thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">SKU / Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Physical Stock</th>
                  <th className="py-3 px-4 text-center">Reorder Threshold</th>
                  <th className="py-3 px-4 text-center">Unit Deficit</th>
                  <th className="py-3 px-4 text-center">Suggested PO Batch</th>
                  <th className="py-3 px-4 text-right">Replenishment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map(item => (
                  <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Badge status={item.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <span className="text-[11px] font-mono text-slate-500">{item.sku}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className={item.currentStock === 0 ? 'text-rose-600' : 'text-amber-700'}>
                        {item.currentStock} {item.unitOfMeasure}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                      {item.reorderThreshold} {item.unitOfMeasure}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                      -{item.deficit ?? (item.reorderThreshold - item.currentStock)} units
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {item.suggestedOrderQty || 50} units
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate('/receipts')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Order Restock</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
