import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Building2,
  AlertTriangle,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User as UserIcon,
  ChevronDown,
  Warehouse as WarehouseIcon,
  PackageCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [alertsList, setAlertsList] = useState<any[]>([]);

  useEffect(() => {
    // Fetch active low stock alerts for the top-bar notification bell
    api.get('/dashboard/alerts')
      .then(res => {
        if (res.data) {
          setLowStockCount(res.data.length);
          setAlertsList(res.data.slice(0, 5));
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Boxes },
    { name: 'Receipts (Inbound)', path: '/receipts', icon: PackageCheck },
    { name: 'Delivery Orders (Outbound)', path: '/deliveries', icon: Truck },
    { name: 'Internal Transfers', path: '/transfers', icon: ArrowLeftRight },
    { name: 'Inventory Adjustments', path: '/adjustments', icon: SlidersHorizontal },
    { name: 'Stock Ledger', path: '/ledger', icon: History },
    { name: 'Warehouses & Bins', path: '/warehouses', icon: Building2 },
    {
      name: 'Stock Alerts',
      path: '/alerts',
      icon: AlertTriangle,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-amber-500'
    },
    ...(isManager ? [{ name: 'User Management', path: '/users', icon: Users }] : []),
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  // Helper to format breadcrumbs
  const getBreadcrumbs = () => {
    const current = navItems.find(item => item.path === location.pathname);
    return current ? current.name : 'Overview';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 antialiased font-sans">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">StockSense</span>
              <span className="block text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Inventory Management
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Inventory Operations
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white ${item.badgeColor || 'bg-indigo-500'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User footer badge */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
                <span className="text-[10px] text-slate-400 block truncate">
                  {user?.role === 'INVENTORY_MANAGER' ? 'Manager' : 'Staff'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">StockSense /</span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {getBreadcrumbs()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action buttons */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate('/receipts')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                + New Receipt
              </button>
              <button
                onClick={() => navigate('/deliveries')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                + New Delivery
              </button>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setAlertOpen(!alertOpen);
                  setProfileOpen(false);
                }}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Low Stock Alerts"
              >
                <Bell className="w-5 h-5" />
                {lowStockCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </button>

              {/* Notification dropdown */}
              {alertOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Reorder Alerts ({lowStockCount})
                      </h4>
                    </div>
                    <Link
                      to="/alerts"
                      onClick={() => setAlertOpen(false)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="py-2 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {alertsList.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No low stock warnings. All items healthy!</p>
                    ) : (
                      alertsList.map(item => (
                        <div key={item.productId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[200px]">{item.name}</p>
                            <span className="text-[11px] text-slate-500">{item.sku}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-rose-600">{item.currentStock} {item.unitOfMeasure}</span>
                            <span className="block text-[10px] text-slate-400">Min: {item.reorderThreshold}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setAlertOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-500">{user?.role === 'INVENTORY_MANAGER' ? 'Manager' : 'Staff'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <span className="mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                      {user?.role}
                    </span>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>User Profile</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>System Settings</span>
                  </Link>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
