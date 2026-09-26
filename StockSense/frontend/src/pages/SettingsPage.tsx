import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  RotateCcw,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { api } from '../services/api.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';

export const SettingsPage: React.FC = () => {
  const { isManager } = useAuth();
  const { success, error } = useNotification();

  const [strictNegativeStockPrevention, setStrictNegativeStockPrevention] = useState(true);
  const [defaultThreshold, setDefaultThreshold] = useState('25');
  const [autoReceiptValidation, setAutoReceiptValidation] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    success('Configuration Saved', 'System inventory thresholds and strict transaction controls updated.');
  };

  const handleResetData = async () => {
    try {
      const res = await api.post('/users/reset-data');
      success('Database Restored', res.message);
      setIsResetConfirmOpen(false);
    } catch (err: any) {
      error('Reset Failed', err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">System Preferences & Inventory Rules</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure system-wide constraints, inventory valuation methods, and transaction protections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Settings Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Inventory Transaction & Concurrency Controls
            </h3>

            <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
              <div className="flex items-start justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-slate-900 block">Strict Negative Stock Guard</span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Atomically reject outbound deliveries if physical stock on hand is less than required units. Prevents overselling race conditions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={strictNegativeStockPrevention}
                  onChange={e => setStrictNegativeStockPrevention(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5"
                />
              </div>

              <div className="flex items-start justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-slate-900 block">Immutable Ledger Audit Mode</span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Guarantees all manual adjustments, transfers, and order dispatches generate permanent ledger transaction entries with actor identification.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ENFORCED
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Reorder Safety Threshold (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={defaultThreshold}
                  onChange={e => setDefaultThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save System Rules
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Database Maintenance */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Database Engine
            </h3>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Engine</span>
              <p className="font-bold text-slate-900">MongoDB / Persistent Document Store</p>
              <span className="text-[11px] text-emerald-600 font-semibold block">Connected & Healthy</span>
            </div>

            <div className="pt-2">
              <span className="font-bold text-slate-800 block mb-1">VS Code Project Package</span>
              <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
                Download the complete error-free project archive to open and run locally in Visual Studio Code.
              </p>
              <a
                href="/StockSense.zip"
                download="StockSense.zip"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors mb-3"
              >
                <span>Download StockSense.zip</span>
              </a>

              <span className="font-bold text-slate-800 block mb-1">Demo Environment Utilities</span>
              <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
                Reset system collections to the master baseline catalog with clean warehouses, stock balances, and test accounts.
              </p>

              {isManager && (
                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Seed Baseline</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Restore Master Seed Baseline"
        message="Are you sure you want to reset the database? This replaces all existing items and orders with the pristine initial catalog fixtures."
        confirmLabel="Reset Everything"
        isDestructive
      />
    </div>
  );
};
