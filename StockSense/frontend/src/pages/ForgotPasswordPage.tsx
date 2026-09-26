import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, ArrowRight, Lock, Mail, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNotification } from '../context/NotificationContext.js';
import { api } from '../services/api.js';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [demoHintOtp, setDemoHintOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      success('OTP Dispatched', res.message);
      if (res.demoHintOtp) {
        setDemoHintOtp(res.demoHintOtp);
        setOtp(res.demoHintOtp); // Auto-fill for convenience in test preview
      }
      setStep('VERIFY');
    } catch (err: any) {
      error('Request Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      error('Validation', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('Validation', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword
      });
      success('Password Updated', res.message);
      navigate('/login');
    } catch (err: any) {
      error('Verification Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white mb-4">
          <Boxes className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Security Password Recovery</h1>
        <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide uppercase">
          Hashed 6-Digit OTP Verification Flow
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {step === 'REQUEST' ? (
            <form onSubmit={handleRequestOTP} className="space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Enter your registered corporate email address to receive a secure, time-limited 6-digit one-time verification challenge.
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Generating Challenge...' : 'Dispatch Verification Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              {demoHintOtp && (
                <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Sandbox Generated OTP: {demoHintOtp}</span>
                    <span className="text-[11px] opacity-80">
                      Auto-populated for seamless demonstration. In production, this code is delivered via corporate SMTP/SMS gateway.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  6-Digit Verification Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="w-full px-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  New Password (min 8 chars) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('REQUEST')}
                  className="w-1/3 py-2.5 border border-slate-700 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md text-xs cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Set New Password'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-400">
            Remember your credentials?{' '}
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
