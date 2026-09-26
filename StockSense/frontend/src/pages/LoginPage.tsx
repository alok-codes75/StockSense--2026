import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Boxes,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Package,
  Layers,
  ArrowLeftRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { api } from '../services/api.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.token, res.user);
      success('Welcome back', `Signed in as ${res.user.fullName}`);
      navigate('/');
    } catch (err: any) {
      error('Sign in failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email: demoEmail, password: demoPass });
      login(res.token, res.user);
      success('Demo Session Started', `Signed in as ${res.user.fullName}`);
      navigate('/');
    } catch (err: any) {
      error('Demo login failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#090D16] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Background Gradient & Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-indigo-600/20 via-blue-600/10 to-transparent blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-indigo-900/15 blur-[100px]" />
        
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Header & Logo */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 shadow-sm mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-200">StockSense IMS</span>
          <span className="text-slate-500">•</span>
          <span className="text-indigo-400 font-medium">Enterprise Warehouse</span>
        </div>

        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <Boxes className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">StockSense</span>
        </div>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Centralized inventory management, multi-warehouse tracking, and stock ledger.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 my-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#0F172A]/90 backdrop-blur-xl py-8 px-6 sm:px-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/60">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Sign in to your account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Access real-time stock balances, purchase receipts, and delivery orders.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                Password123!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('manager@stocksense.io', 'Password123!')}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Manager</div>
                  <div className="text-[11px] text-slate-400 truncate">Prince sah</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff@stocksense.io', 'Password123!')}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Warehouse Staff</div>
                  <div className="text-[11px] text-slate-400 truncate">Alok gupta</div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-400">
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Create account
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Feature Badges */}
      <div className="relative z-10 py-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Live Stock Balances
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            Inbound & Outbound Workflows
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            Auditable Stock Ledger
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            Role-Based Access
          </span>
        </div>
      </div>
    </div>
  );
};
