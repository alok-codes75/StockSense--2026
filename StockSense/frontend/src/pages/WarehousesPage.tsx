import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Boxes,
  Phone,
  Mail,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { LoadingSpinner, EmptyState } from '../components/EmptyState.js';
import { Warehouse, Location } from '../types/index.js';

export const WarehousesPage: React.FC = () => {
  const { isManager } = useAuth();
  const { success, error } = useNotification();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // Forms
  const [whForm, setWhForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [locForm, setLocForm] = useState({
    warehouseId: '',
    code: '',
    name: '',
    zone: '',
    aisle: '',
    shelf: '',
    capacity: '5000'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [whRes, locRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/warehouses/locations')
      ]);
      if (whRes.data) setWarehouses(whRes.data);
      if (locRes.data) setLocations(locRes.data);
    } catch (err: any) {
      error('Failed to load warehouses', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/warehouses', whForm);
      success('Warehouse Created', `Warehouse ${whForm.code} added to network.`);
      setIsWarehouseModalOpen(false);
      setWhForm({ code: '', name: '', address: '', city: '', contactEmail: '', contactPhone: '' });
      fetchData();
    } catch (err: any) {
      error('Cannot Create Warehouse', err.message);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/warehouses/locations', {
        ...locForm,
        capacity: Number(locForm.capacity) || 1000
      });
      success('Location Created', `Location ${locForm.code} created.`);
      setIsLocationModalOpen(false);
      setLocForm({ warehouseId: '', code: '', name: '', zone: '', aisle: '', shelf: '', capacity: '5000' });
      fetchData();
    } catch (err: any) {
      error('Cannot Create Location', err.message);
    }
  };

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;
    try {
      const res = await api.delete(`/warehouses/locations/${locationToDelete._id}`);
      success('Location Managed', res.message);
      setIsDeleteConfirmOpen(false);
      setLocationToDelete(null);
      fetchData();
    } catch (err: any) {
      error('Action Blocked', err.message);
    }
  };

  const filteredLocations =
    selectedWarehouseId === 'ALL'
      ? locations
      : locations.filter(l => l.warehouseId === selectedWarehouseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Warehouses & Storage Bin Architecture</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage distribution facilities, pick zones, bulk aisles, and physical storage bin capacities.
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWarehouseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-xs"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Add Warehouse</span>
            </button>
            <button
              onClick={() => {
                if (warehouses.length > 0 && !locForm.warehouseId) {
                  setLocForm(prev => ({ ...prev, warehouseId: warehouses[0]._id }));
                }
                setIsLocationModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Location / Bin</span>
            </button>
          </div>
        )}
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map(w => (
          <div
            key={w._id}
            onClick={() => setSelectedWarehouseId(selectedWarehouseId === w._id ? 'ALL' : w._id)}
            className={`p-5 rounded-xl border transition-all cursor-pointer bg-white ${
              selectedWarehouseId === w._id
                ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  {w.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">{w.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {w.city || w.address || 'Facility Address'}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                <strong>{w.locationsCount || 0}</strong> Active Bins
              </span>
              <span className="font-bold text-slate-900">
                {(w.totalStockUnits || 0).toLocaleString()} Units Stored
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Locations Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Storage Bins & Pick Locations ({filteredLocations.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Warehouse:</span>
            <select
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading location inventory balances..." />
        ) : filteredLocations.length === 0 ? (
          <EmptyState
            title="No Locations Configured"
            description="Create storage aisles and bins inside your warehouse facility."
            actionLabel={isManager ? "Create First Bin" : undefined}
            onAction={() => setIsLocationModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Location Code</th>
                  <th className="py-3 px-4">Designation / Bin Name</th>
                  <th className="py-3 px-4">Facility / Warehouse</th>
                  <th className="py-3 px-4">Zone & Aisle</th>
                  <th className="py-3 px-4 text-right">Physical Units</th>
                  <th className="py-3 px-4 text-right">SKU Varieties</th>
                  <th className="py-3 px-4 text-right">Max Capacity</th>
                  {isManager && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.map(l => (
                  <tr key={l._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {l.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {l.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {l.warehouseName} ({l.warehouseCode})
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{l.zone}</div>
                      <span className="text-[10px] text-slate-400">{l.aisle || 'Open Bay'} {l.shelf && `| ${l.shelf}`}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {(l.totalItemsInLocation || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {l.distinctProductsCount || 0} SKUs
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                      {l.capacity.toLocaleString()} units
                    </td>
                    {isManager && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setLocationToDelete(l);
                            setIsDeleteConfirmOpen(true);
                          }}
                          title="Delete / Deactivate Location"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Warehouse Modal */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title="Register New Warehouse Facility"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. WH-SOUTH"
                value={whForm.code}
                onChange={e => setWhForm({ ...whForm, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Facility Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. South Regional Hub"
                value={whForm.name}
                onChange={e => setWhForm({ ...whForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                placeholder="100 Logistics Way"
                value={whForm.address}
                onChange={e => setWhForm({ ...whForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City, State</label>
              <input
                type="text"
                placeholder="Atlanta, GA"
                value={whForm.city}
                onChange={e => setWhForm({ ...whForm, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsWarehouseModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Save Warehouse
            </button>
          </div>
        </form>
      </Modal>

      {/* New Location Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Add Storage Location / Bin"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Parent Warehouse *</label>
            <select
              required
              value={locForm.warehouseId}
              onChange={e => setLocForm({ ...locForm, warehouseId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. B-02-RACK"
                value={locForm.code}
                onChange={e => setLocForm({ ...locForm, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bin Name / Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. Zone B High Shelf 2"
                value={locForm.name}
                onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Zone *</label>
              <input
                type="text"
                required
                placeholder="Zone B"
                value={locForm.zone}
                onChange={e => setLocForm({ ...locForm, zone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Aisle</label>
              <input
                type="text"
                placeholder="Aisle 2"
                value={locForm.aisle}
                onChange={e => setLocForm({ ...locForm, aisle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Capacity</label>
              <input
                type="number"
                min="100"
                value={locForm.capacity}
                onChange={e => setLocForm({ ...locForm, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Create Location
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Location Safety Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteLocation}
        title="Remove / Deactivate Location"
        message={`Are you sure you want to remove storage location "${locationToDelete?.code}"? The system will verify that 0 physical stock remains. If historical movements reference this location, it will be safely deactivated rather than deleted.`}
        confirmLabel="Proceed"
        isDestructive
      />
    </div>
  );
};
