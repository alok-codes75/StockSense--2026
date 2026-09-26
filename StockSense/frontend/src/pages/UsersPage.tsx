import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  RotateCcw,
  Mail,
  Building2
} from 'lucide-react';
import { api } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { LoadingSpinner } from '../components/EmptyState.js';

export const UsersPage: React.FC = () => {
  const { success, error } = useNotification();

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'WAREHOUSE_STAFF',
    department: 'Warehouse Operations'
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data) setUsers(res.data);
    } catch (err: any) {
      error('Failed to load user roster', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      success('User Enrolled', `Account created for ${form.fullName}.`);
      setIsCreateModalOpen(false);
      setForm({ fullName: '', email: '', password: '', role: 'WAREHOUSE_STAFF', department: 'Warehouse Operations' });
      fetchUsers();
    } catch (err: any) {
      error('Cannot Enroll User', err.message);
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const res = await api.patch(`/users/${user.id}/toggle-status`);
      success('User Status Updated', res.message);
      fetchUsers();
    } catch (err: any) {
      error('Update Failed', err.message);
    }
  };

  const handleResetData = async () => {
    try {
      const res = await api.post('/users/reset-data');
      success('Database Reset', res.message);
      setIsResetConfirmOpen(false);
      fetchUsers();
    } catch (err: any) {
      error('Reset Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">User & Role-Based Access Control</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage warehouse personnel, assign roles (Inventory Manager / Warehouse Staff), and maintain team security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Reset Demo Seed Data</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading user authorization records..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {u.fullName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {u.department || 'Operations'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={u.role} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                          u.isActive
                            ? 'border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                            : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enroll User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Enroll New Personnel"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Jordan Miller"
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Corporate Email *</label>
            <input
              type="email"
              required
              placeholder="jordan@company.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initial Password (min 8 chars) *</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                placeholder="Fulfillment"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Enroll User
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Seed Data Confirmation */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Reset Baseline Demo Data"
        message="Are you sure you want to reset the database to baseline master fixtures? All custom products, receipts, deliveries, and adjustments will be restored to the clean initial demo state."
        confirmLabel="Reset Database"
        isDestructive
      />
    </div>
  );
};
